// TMDB API Configuration
const API_CONFIG = {
    apiKey: 'b9af48dd394a86cbfe6a4f0f4a1c694b',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
    backdropBaseUrl: 'https://image.tmdb.org/t/p/original'
};

// API Endpoints
const ENDPOINTS = {
    popular: '/movie/popular',
    nowPlaying: '/movie/now_playing',
    topRated: '/movie/top_rated',
    movieDetails: '/movie',
    movieCredits: '/movie/{id}/credits',
    movieVideos: '/movie/{id}/videos',
    searchMovies: '/search/movie',
    similar: '/movie/{id}/similar'
};

// YouTube Configuration
const YOUTUBE_CONFIG = {
    embedBaseUrl: 'https://www.youtube.com/embed/',
    autoplayParams: '?autoplay=1&mute=0&controls=1&showinfo=1&rel=0&modestbranding=1'
};

// App State
let appState = {
    movies: {
        popular: [],
        nowPlaying: [],
        topRated: []
    },
    currentHeroMovie: null,
    scrollPositions: {
        popular: 0,
        'now-playing': 0,
        'top-rated': 0
    },
    searchResults: [],
    isSearching: false
};

// Utility Functions
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const formatRuntime = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

const formatRating = (rating) => {
    return rating ? rating.toFixed(1) : 'N/A';
};

const formatYear = (dateString) => {
    return dateString ? new Date(dateString).getFullYear() : '';
};

// API Functions
const fetchFromAPI = async (endpoint, params = {}) => {
    try {
        const url = new URL(`${API_CONFIG.baseUrl}${endpoint}`);
        url.searchParams.append('api_key', API_CONFIG.apiKey);
        
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

const fetchPopularMovies = () => fetchFromAPI(ENDPOINTS.popular);
const fetchNowPlayingMovies = () => fetchFromAPI(ENDPOINTS.nowPlaying);
const fetchTopRatedMovies = () => fetchFromAPI(ENDPOINTS.topRated);
const fetchMovieDetails = (movieId) => fetchFromAPI(`${ENDPOINTS.movieDetails}/${movieId}`);
const fetchMovieCredits = (movieId) => fetchFromAPI(`${ENDPOINTS.movieDetails}/${movieId}/credits`);
const fetchMovieVideos = (movieId) => fetchFromAPI(`${ENDPOINTS.movieDetails}/${movieId}/videos`);
const fetchSimilarMovies = (movieId) => fetchFromAPI(`${ENDPOINTS.movieDetails}/${movieId}/similar`);
const searchMovies = (query) => fetchFromAPI(ENDPOINTS.searchMovies, { query });

// DOM Manipulation Functions
const createMovieCard = (movie) => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.movieId = movie.id;
    
    const posterPath = movie.poster_path 
        ? `${API_CONFIG.imageBaseUrl}${movie.poster_path}`
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMzNzQxNTEiLz48L3N2Zz4=';
    
    card.innerHTML = `
        <div class="movie-poster">
            <img src="${posterPath}" alt="${movie.title}" class="movie-poster-img" loading="lazy">
            <div class="movie-overlay">
                <div class="play-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"></polygon>
                    </svg>
                </div>
            </div>
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <div class="movie-meta">
                <span class="movie-year">${formatYear(movie.release_date)}</span>
                <div class="movie-rating">
                    <span>⭐</span>
                    <span>${formatRating(movie.vote_average)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Add click handler for movie details
    card.addEventListener('click', (e) => {
        // If clicked on overlay/play icon, show trailer
        if (e.target.closest('.movie-overlay') || e.target.closest('.play-icon')) {
            e.stopPropagation();
            openTrailerModal(movie.id);
        } else {
            // Otherwise show movie details
            openMovieModal(movie.id);
        }
    });
    return card;
};

const createSkeletonCard = () => {
    const card = document.createElement('div');
    card.className = 'movie-card skeleton';
    card.innerHTML = `
        <div class="movie-poster skeleton"></div>
        <div class="movie-info">
            <div class="movie-title skeleton" style="height: 20px; margin-bottom: 8px;"></div>
            <div class="movie-meta">
                <div class="skeleton" style="height: 16px; width: 60px;"></div>
                <div class="skeleton" style="height: 16px; width: 40px;"></div>
            </div>
        </div>
    `;
    return card;
};

const renderMovies = (movies, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    movies.forEach(movie => {
        container.appendChild(createMovieCard(movie));
    });
};

const renderSkeletons = (containerId, count = 10) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.appendChild(createSkeletonCard());
    }
};

const setupHeroSection = (movie) => {
    if (!movie) return;
    
    appState.currentHeroMovie = movie;
    
    const heroTitle = document.getElementById('hero-title');
    const heroOverview = document.getElementById('hero-overview');
    const heroYear = document.getElementById('hero-year');
    const heroRating = document.getElementById('hero-rating');
    const heroBackdrop = document.getElementById('hero-backdrop-img');
    const heroPlayBtn = document.getElementById('hero-play-btn');
    const heroInfoBtn = document.getElementById('hero-info-btn');
    
    if (heroTitle) heroTitle.textContent = movie.title;
    if (heroOverview) heroOverview.textContent = movie.overview || 'No overview available.';
    if (heroYear) heroYear.textContent = formatYear(movie.release_date);
    if (heroRating) heroRating.innerHTML = `⭐ ${formatRating(movie.vote_average)}`;
    
    if (heroBackdrop && movie.backdrop_path) {
        heroBackdrop.src = `${API_CONFIG.backdropBaseUrl}${movie.backdrop_path}`;
        heroBackdrop.alt = movie.title;
    }
    
    if (heroPlayBtn) {
        heroPlayBtn.onclick = () => openTrailerModal(movie.id);
    }
    
    if (heroInfoBtn) {
        heroInfoBtn.onclick = () => openMovieModal(movie.id);
    }
};

// Movie Modal Functions
const openMovieModal = async (movieId) => {
    const modal = document.getElementById('movie-modal');
    if (!modal) return;
    
    try {
        // Show modal with loading state
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Fetch movie details, credits, and similar movies
        const [movieDetails, credits, similar] = await Promise.all([
            fetchMovieDetails(movieId),
            fetchMovieCredits(movieId),
            fetchSimilarMovies(movieId)
        ]);
        
        // Populate modal content
        populateMovieModal(movieDetails, credits, similar);
        
    } catch (error) {
        console.error('Error loading movie details:', error);
        closeMovieModal();
    }
};

const populateMovieModal = (movie, credits, similar) => {
    // Update backdrop
    const backdropImg = document.getElementById('modal-backdrop-img');
    if (backdropImg && movie.backdrop_path) {
        backdropImg.src = `${API_CONFIG.backdropBaseUrl}${movie.backdrop_path}`;
    }
    
    // Update poster
    const posterImg = document.getElementById('modal-poster-img');
    if (posterImg) {
        const posterPath = movie.poster_path 
            ? `${API_CONFIG.imageBaseUrl}${movie.poster_path}`
            : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0NTAiIGZpbGw9IiMzNzQxNTEiLz48L3N2Zz4=';
        posterImg.src = posterPath;
    }
    
    // Update title and meta info
    const titleEl = document.getElementById('modal-title');
    const yearEl = document.getElementById('modal-year');
    const runtimeEl = document.getElementById('modal-runtime');
    const ratingEl = document.getElementById('modal-rating');
    const overviewEl = document.getElementById('modal-overview');
    
    if (titleEl) titleEl.textContent = movie.title;
    if (yearEl) yearEl.textContent = formatYear(movie.release_date);
    if (runtimeEl) runtimeEl.textContent = formatRuntime(movie.runtime);
    if (ratingEl) ratingEl.innerHTML = `⭐ ${formatRating(movie.vote_average)}`;
    if (overviewEl) overviewEl.textContent = movie.overview || 'No overview available.';
    
    // Update genres
    const genresContainer = document.getElementById('modal-genres');
    if (genresContainer && movie.genres) {
        genresContainer.innerHTML = movie.genres.map(genre => 
            `<span class="genre-tag">${genre.name}</span>`
        ).join('');
    }
    
    // Update modal actions with correct movie ID
    const modalActions = document.querySelector('.modal-actions');
    if (modalActions) {
        modalActions.innerHTML = `
            <button class="btn btn-primary modal-play-btn" onclick="openTrailerModal(${movie.id})">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21"></polygon>
                </svg>
                Watch Trailer
            </button>
        `;
    }
    
    // Update cast
    const castContainer = document.getElementById('cast-list');
    if (castContainer && credits.cast) {
        const topCast = credits.cast.slice(0, 10);
        castContainer.innerHTML = topCast.map(actor => {
            const photoPath = actor.profile_path 
                ? `${API_CONFIG.imageBaseUrl}${actor.profile_path}`
                : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI0MCIgY3k9IjQwIiByPSI0MCIgZmlsbD0iIzM3NDE1MSIvPjwvc3ZnPg==';
            
            return `
                <div class="cast-member">
                    <img src="${photoPath}" alt="${actor.name}" class="cast-photo" loading="lazy">
                    <div class="cast-name">${actor.name}</div>
                    <div class="cast-character">${actor.character || ''}</div>
                </div>
            `;
        }).join('');
    }
    
    // Update similar movies
    const similarContainer = document.getElementById('similar-movies');
    if (similarContainer && similar.results) {
        const topSimilar = similar.results.slice(0, 10);
        similarContainer.innerHTML = topSimilar.map(movie => {
            const posterPath = movie.poster_path 
                ? `${API_CONFIG.imageBaseUrl}${movie.poster_path}`
                : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIyNSIgdmlld0JveD0iMCAwIDE1MCAyMjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIyMjUiIGZpbGw9IiMzNzQxNTEiLz48L3N2Zz4=';
            
            return `
                <div class="movie-card" data-movie-id="${movie.id}" onclick="openMovieModal(${movie.id})">
                    <div class="movie-poster">
                        <img src="${posterPath}" alt="${movie.title}" class="movie-poster-img" loading="lazy">
                        <div class="movie-overlay">
                            <div class="play-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5,3 19,12 5,21"></polygon>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="movie-info">
                        <h3 class="movie-title">${movie.title}</h3>
                        <div class="movie-meta">
                            <span class="movie-year">${formatYear(movie.release_date)}</span>
                            <div class="movie-rating">
                                <span>⭐</span>
                                <span>${formatRating(movie.vote_average)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

const closeMovieModal = () => {
    const modal = document.getElementById('movie-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

// Trailer Modal Functions
const openTrailerModal = async (movieId) => {
    const modal = document.getElementById('trailer-modal');
    const loadingEl = document.getElementById('trailer-loading');
    const errorEl = document.getElementById('trailer-error');
    const iframe = document.getElementById('trailer-iframe');
    
    if (!modal) return;
    
    try {
        // Show modal with loading state
        modal.classList.remove('hidden');
        loadingEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
        iframe.classList.add('hidden');
        document.body.style.overflow = 'hidden';
        
        // Fetch movie videos
        const videoData = await fetchMovieVideos(movieId);
        const videos = videoData.results || [];
        
        // Find YouTube trailer
        const trailer = videos.find(video => 
            video.site === 'YouTube' && 
            video.type === 'Trailer' &&
            video.key
        );
        
        if (!trailer) {
            // No trailer found
            loadingEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
            return;
        }
        
        // Load YouTube trailer
        const embedUrl = `${YOUTUBE_CONFIG.embedBaseUrl}${trailer.key}${YOUTUBE_CONFIG.autoplayParams}`;
        iframe.src = embedUrl;
        
        // Show iframe when loaded
        iframe.onload = () => {
            loadingEl.classList.add('hidden');
            iframe.classList.remove('hidden');
        };
        
    } catch (error) {
        console.error('Error loading trailer:', error);
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
    }
};

const closeTrailerModal = () => {
    const modal = document.getElementById('trailer-modal');
    const iframe = document.getElementById('trailer-iframe');
    const loadingEl = document.getElementById('trailer-loading');
    const errorEl = document.getElementById('trailer-error');
    
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Stop video by clearing src
        if (iframe) {
            iframe.src = '';
            iframe.classList.add('hidden');
        }
        
        // Reset modal state
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (errorEl) errorEl.classList.add('hidden');
    }
};

// Search Functions
const performSearch = async (query) => {
    if (!query.trim()) {
        hideSearchResults();
        return;
    }
    
    appState.isSearching = true;
    
    try {
        const results = await searchMovies(query);
        appState.searchResults = results.results || [];
        displaySearchResults();
    } catch (error) {
        console.error('Search error:', error);
        hideSearchResults();
    } finally {
        appState.isSearching = false;
    }
};

const displaySearchResults = () => {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    
    if (appState.searchResults.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item"><p>No movies found</p></div>';
        resultsContainer.classList.remove('hidden');
        return;
    }
    
    const topResults = appState.searchResults.slice(0, 8);
    resultsContainer.innerHTML = topResults.map(movie => {
        const posterPath = movie.poster_path 
            ? `${API_CONFIG.imageBaseUrl}${movie.poster_path}`
            : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNzUiIHZpZXdCb3g9IjAgMCA1MCA3NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNzUiIGZpbGw9IiMzNzQxNTEiLz48L3N2Zz4=';
        
        return `
            <div class="search-result-item" data-movie-id="${movie.id}">
                <img src="${posterPath}" alt="${movie.title}" class="search-result-poster" loading="lazy">
                <div class="search-result-info">
                    <h4>${movie.title}</h4>
                    <p>${formatYear(movie.release_date)} • ⭐ ${formatRating(movie.vote_average)}</p>
                </div>
            </div>
        `;
    }).join('');
    
    resultsContainer.classList.remove('hidden');
    
    // Add click handlers to search results
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const movieId = e.currentTarget.dataset.movieId;
            if (movieId) {
                hideSearchResults();
                document.getElementById('search-input').value = '';
                openMovieModal(movieId);
            }
        });
    });
};

const hideSearchResults = () => {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.classList.add('hidden');
    }
};

// Scroll Navigation Functions
const scrollMovieSection = (direction, sectionName) => {
    const container = document.querySelector(`[data-section="${sectionName}"]`);
    if (!container) return;
    
    const cardWidth = 200 + 16; // card width + gap
    const scrollAmount = cardWidth * 3; // scroll 3 cards at a time
    const currentScroll = appState.scrollPositions[sectionName] || 0;
    
    let newScroll;
    if (direction === 'next') {
        newScroll = currentScroll + scrollAmount;
    } else {
        newScroll = Math.max(0, currentScroll - scrollAmount);
    }
    
    // Check bounds
    const maxScroll = container.scrollWidth - container.parentElement.clientWidth;
    newScroll = Math.min(newScroll, maxScroll);
    
    appState.scrollPositions[sectionName] = newScroll;
    container.style.transform = `translateX(-${newScroll}px)`;
    
    // Update navigation button states
    updateNavButtons(sectionName, newScroll, maxScroll);
};

const updateNavButtons = (sectionName, currentScroll, maxScroll) => {
    const prevBtn = document.querySelector(`[data-section="${sectionName}"].prev`);
    const nextBtn = document.querySelector(`[data-section="${sectionName}"].next`);
    
    if (prevBtn) {
        prevBtn.disabled = currentScroll <= 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentScroll >= maxScroll;
    }
};

// Event Listeners
const setupEventListeners = () => {
    // Modal close
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modal = document.getElementById('movie-modal');
    
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeMovieModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeMovieModal();
            }
        });
    }
    
    // Trailer modal close
    const trailerCloseBtn = document.getElementById('trailer-close-btn');
    const trailerModal = document.getElementById('trailer-modal');
    
    if (trailerCloseBtn) {
        trailerCloseBtn.addEventListener('click', closeTrailerModal);
    }
    
    if (trailerModal) {
        trailerModal.addEventListener('click', (e) => {
            if (e.target === trailerModal || e.target.classList.contains('trailer-modal-backdrop')) {
                closeTrailerModal();
            }
        });
    }
    
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMovieModal();
            closeTrailerModal();
            hideSearchResults();
        }
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const debouncedSearch = debounce(performSearch, 300);
        
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
        
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim() && appState.searchResults.length > 0) {
                displaySearchResults();
            }
        });
    }
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        const searchContainer = document.querySelector('.nav-search');
        if (searchContainer && !searchContainer.contains(e.target)) {
            hideSearchResults();
        }
    });
    
    // Navigation buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.nav-btn')) {
            const btn = e.target.closest('.nav-btn');
            const direction = btn.classList.contains('prev') ? 'prev' : 'next';
            const section = btn.dataset.section;
            
            if (section) {
                scrollMovieSection(direction, section);
            }
        }
    });
    
    // Navbar scroll effect
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (navbar) {
            if (scrollTop > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
        
        lastScrollTop = scrollTop;
    });
    
    // Logo click to scroll to top
    const logo = document.querySelector('.nav-logo');
    if (logo) {
        logo.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
};

// Initialization Functions
const loadMovieData = async () => {
    try {
        // Show skeleton loaders
        renderSkeletons('popular-movies');
        renderSkeletons('now-playing-movies');
        renderSkeletons('top-rated-movies');
        
        // Fetch all movie categories
        const [popularData, nowPlayingData, topRatedData] = await Promise.all([
            fetchPopularMovies(),
            fetchNowPlayingMovies(),
            fetchTopRatedMovies()
        ]);
        
        // Store in app state
        appState.movies.popular = popularData.results || [];
        appState.movies.nowPlaying = nowPlayingData.results || [];
        appState.movies.topRated = topRatedData.results || [];
        
        // Render movies
        renderMovies(appState.movies.popular, 'popular-movies');
        renderMovies(appState.movies.nowPlaying, 'now-playing-movies');
        renderMovies(appState.movies.topRated, 'top-rated-movies');
        
        // Setup hero section with first popular movie
        if (appState.movies.popular.length > 0) {
            setupHeroSection(appState.movies.popular[0]);
        }
        
    } catch (error) {
        console.error('Error loading movie data:', error);
    }
};

const hideLoadingScreen = () => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 500);
    }
};

const initializeApp = async () => {
    try {
        // Setup event listeners
        setupEventListeners();
        
        // Load movie data
        await loadMovieData();
        
        // Hide loading screen
        hideLoadingScreen();
        
        console.log('MovieStream app initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoadingScreen();
    }
};

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Global functions for inline event handlers
window.openMovieModal = openMovieModal;
window.closeMovieModal = closeMovieModal;
window.openTrailerModal = openTrailerModal;
window.closeTrailerModal = closeTrailerModal;