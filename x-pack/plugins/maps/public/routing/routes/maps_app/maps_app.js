/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import 'mapbox-gl/dist/mapbox-gl.css';
import _ from 'lodash';
import { DEFAULT_IS_LAYER_TOC_OPEN } from '../../../reducers/ui';
import {
  getIndexPatternService,
  getToasts,
  getData,
  getUiSettings,
  getCoreChrome,
} from '../../../kibana_services';
import { copyPersistentState } from '../../../reducers/util';
import { getInitialLayers } from '../../bootstrap/get_initial_layers';
import rison from 'rison-node';
import { getInitialTimeFilters } from '../../bootstrap/get_initial_time_filters';
import { getInitialRefreshConfig } from '../../bootstrap/get_initial_refresh_config';
import { getInitialQuery } from '../../bootstrap/get_initial_query';
import { MapsTopNavMenu } from '../../page_elements/top_nav_menu';
import {
  getGlobalState,
  updateGlobalState,
  useGlobalStateSyncing,
} from '../../state_syncing/global_sync';
import { AppStateManager } from '../../state_syncing/app_state_manager';
import { useAppStateSyncing } from '../../state_syncing/app_sync';
import { subscribeToSyncStore } from '../../store_operations';
import { MapsRoot } from '../../page_elements/maps_root';
import { updateBreadcrumbs } from '../../page_elements/breadcrumbs';
import { esFilters } from '../../../../../../../src/plugins/data/public';

export const MapsAppView = class extends React.Component {
  _visibleSubscription = null;
  _storeSyncUnsubscribe = null;
  _globalSyncUnsubscribe = null;
  _appSyncUnsubscribe = null;
  _appStateManager = new AppStateManager();

  constructor(props) {
    super(props);
    this.state = {
      indexPatterns: [],
      prevIndexPatternIds: [],
      filters: [],
      initialized: false,
      isVisible: true,
      savedQuery: null,
      currentPath: '',
      initialLayerListConfig: null,
      globalStateSnapshot: {},
    };
  }

  componentDidMount() {
    const { savedMap, currentPath } = this.props;
    this.setState({ currentPath });

    getCoreChrome().docTitle.change(savedMap.title);
    getCoreChrome().recentlyAccessed.add(savedMap.getFullPath(), savedMap.title, savedMap.id);

    // Init sync utils
    // eslint-disable-next-line react-hooks/rules-of-hooks
    this._globalSyncUnsubscribe = useGlobalStateSyncing();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    this._appSyncUnsubscribe = useAppStateSyncing(this._appStateManager);

    // Check app state in case of refresh
    const initAppState = this._appStateManager.getAppState();
    this._onQueryChange(initAppState);
    if (initAppState.savedQuery) {
      this._updateStateFromSavedQuery(initAppState.savedQuery);
    }

    // Monitor visibility
    this._visibleSubscription = getCoreChrome()
      .getIsVisible$()
      .subscribe((isVisible) => this.setState({ isVisible }));
    this._initMap();
  }

  _initBreadcrumbUpdater = () => {
    const { initialLayerListConfig, currentPath } = this.state;
    updateBreadcrumbs(this.props.savedMap, initialLayerListConfig, currentPath);
  };

  componentDidUpdate(prevProps, prevState) {
    const { currentPath: prevCurrentPath } = prevState;
    const { currentPath, initialLayerListConfig, globalStateSnapshot } = this.state;
    const { savedMap } = this.props;
    if (savedMap && initialLayerListConfig && currentPath !== prevCurrentPath) {
      updateBreadcrumbs(savedMap, initialLayerListConfig, currentPath);
    }
    // TODO: Handle null when converting to TS
    const globalState = getGlobalState();
    if (globalState && !_.isEqual(globalStateSnapshot, globalState)) {
      this.setState({ globalStateSnapshot: globalState });
      this._updateFromGlobalState(globalState);
    }
  }

  _updateFromGlobalState(globalState) {
    const { filterManager } = getData().query;
    const { filters, refreshInterval, time } = this.state;
    const newState = {};

    let newFilters;
    if (!_.isEqual(globalState.filters, filters)) {
      filterManager.setFilters(filters); // Maps and merges filters
      newFilters = filterManager.getFilters();
      newState.filters = newFilters;
    }
    if (!_.isEqual(globalState.refreshInterval, refreshInterval)) {
      newState.refreshInterval = globalState.refreshInterval;
    }
    if (!_.isEqual(globalState.time, time)) {
      newState.time = globalState.time;
    }
    if (!_.isEmpty(newState)) {
      this.setState(newState, () => {
        const { query, filters, refreshInterval, time } = this.state;
        this._appStateManager.setQueryAndFilters({
          query: this.state.query,
          filters: filterManager.getAppFilters(),
        });
        this.props.dispatchSetQuery(refreshInterval, filters, query, time);
      });
    }
  }

  componentWillUnmount() {
    if (this._storeSyncUnsubscribe) {
      this._storeSyncUnsubscribe();
    }
    if (this._globalSyncUnsubscribe) {
      this._globalSyncUnsubscribe();
    }
    if (this._appSyncUnsubscribe) {
      this._appSyncUnsubscribe();
    }
    if (this._visibleSubscription) {
      this._visibleSubscription.unsubscribe();
    }

    // Clean up app state filters
    const { filterManager } = getData().query;
    filterManager.filters.forEach((filter) => {
      if (filter.$state.store === esFilters.FilterStateStore.APP_STATE) {
        filterManager.removeFilter(filter);
      }
    });
  }

  _getInitialLayersFromUrlParam() {
    const locationSplit = window.location.href.split('?');
    if (locationSplit.length <= 1) {
      return [];
    }
    const mapAppParams = new URLSearchParams(locationSplit[1]);
    if (!mapAppParams.has('initialLayers')) {
      return [];
    }

    try {
      let mapInitLayers = mapAppParams.get('initialLayers');
      if (mapInitLayers[mapInitLayers.length - 1] === '#') {
        mapInitLayers = mapInitLayers.substr(0, mapInitLayers.length - 1);
      }
      return rison.decode_array(mapInitLayers);
    } catch (e) {
      getToasts().addWarning({
        title: i18n.translate('xpack.maps.initialLayers.unableToParseTitle', {
          defaultMessage: `Initial layers not added to map`,
        }),
        text: i18n.translate('xpack.maps.initialLayers.unableToParseMessage', {
          defaultMessage: `Unable to parse contents of 'initialLayers' parameter. Error: {errorMsg}`,
          values: { errorMsg: e.message },
        }),
      });
      return [];
    }
  }

  async _updateIndexPatterns(nextIndexPatternIds) {
    const indexPatterns = [];
    const getIndexPatternPromises = nextIndexPatternIds.map(async (indexPatternId) => {
      try {
        const indexPattern = await getIndexPatternService().get(indexPatternId);
        indexPatterns.push(indexPattern);
      } catch (err) {
        // unable to fetch index pattern
      }
    });

    await Promise.all(getIndexPatternPromises);
    this.setState({
      indexPatterns,
    });
  }

  _handleStoreChanges = async () => {
    const { prevIndexPatternIds } = this.state;
    const { nextIndexPatternIds } = this.props;
    const storeUpdates = {};

    if (nextIndexPatternIds !== prevIndexPatternIds) {
      storeUpdates.prevIndexPatternIds = nextIndexPatternIds;
      await this._updateIndexPatterns(nextIndexPatternIds);
    }

    if (!_.isEmpty(storeUpdates)) {
      this.setState(storeUpdates);
    }
  };

  _getAppStateFilters = () => {
    return this._appStateManager.getFilters() || [];
  };

  _syncAppAndGlobalState = () => {
    const { query, time, refreshConfig, initialized } = this.state;
    const { filterManager } = getData().query;

    // appState
    this._appStateManager.setQueryAndFilters({
      query: query,
      filters: filterManager.getAppFilters(),
    });

    // globalState
    const refreshInterval = {
      pause: refreshConfig.isPaused,
      value: refreshConfig.interval,
    };
    updateGlobalState(
      {
        time: time,
        refreshInterval,
        filters: filterManager.getGlobalFilters(),
      },
      !initialized
    );
    this.setState({ refreshInterval });
  };

  _onQueryChange = async ({ filters, query, time, refresh }) => {
    const { filterManager } = getData().query;
    const { dispatchSetQuery } = this.props;
    const newState = {};
    let newFilters;
    if (filters) {
      filterManager.setFilters(filters); // Maps and merges filters
      newFilters = filterManager.getFilters();
      newState.filters = newFilters;
    }
    if (query) {
      newState.query = query;
    }
    if (time) {
      newState.time = time;
    }
    this.setState(newState, () => {
      this._syncAppAndGlobalState();
      dispatchSetQuery(
        refresh,
        newFilters || this.state.filters,
        query || this.state.query,
        time || this.state.time
      );
      updateGlobalState(
        { ...newState, filters: filterManager.getGlobalFilters() },
        !this.state.initialized
      );
    });
  };

  _initQueryTimeRefresh() {
    const { setRefreshConfig, savedMap } = this.props;
    // TODO: Handle null when converting to TS
    const globalState = getGlobalState();
    const mapStateJSON = savedMap ? savedMap.mapStateJSON : undefined;
    const newState = {
      query: getInitialQuery({
        mapStateJSON,
        appState: this._appStateManager.getAppState(),
        userQueryLanguage: getUiSettings().get('search:queryLanguage'),
      }),
      time: getInitialTimeFilters({
        mapStateJSON,
        globalState,
      }),
      refreshConfig: getInitialRefreshConfig({
        mapStateJSON,
        globalState,
      }),
    };
    this.setState(newState);
    updateGlobalState(
      {
        time: newState.time,
        refreshInterval: {
          value: newState.refreshConfig.interval,
          pause: newState.refreshConfig.isPaused,
        },
      },
      !this.state.initialized
    );
    setRefreshConfig(newState.refreshConfig);
  }

  _initMapAndLayerSettings() {
    const { savedMap } = this.props;
    // Get saved map & layer settings
    this._initQueryTimeRefresh();

    const layerList = getInitialLayers(
      savedMap.layerListJSON,
      this._getInitialLayersFromUrlParam()
    );
    this.props.replaceLayerList(layerList);
    this.setState(
      {
        initialLayerListConfig: copyPersistentState(layerList),
        savedMap,
      },
      this._initBreadcrumbUpdater
    );
  }

  _updateFiltersAndDispatch = (filters) => {
    this._onQueryChange({
      filters,
    });
  };

  _onRefreshChange = ({ isPaused, refreshInterval }) => {
    const { refreshConfig } = this.state;
    const newRefreshConfig = {
      isPaused,
      interval: isNaN(refreshInterval) ? refreshConfig.interval : refreshInterval,
    };
    this.setState({ refreshConfig: newRefreshConfig }, this._syncAppAndGlobalState);
    this.props.setRefreshConfig(newRefreshConfig);
  };

  _updateStateFromSavedQuery(savedQuery) {
    const { filterManager } = getData().query;
    const savedQueryFilters = savedQuery.attributes.filters || [];
    const globalFilters = filterManager.getGlobalFilters();
    const allFilters = [...savedQueryFilters, ...globalFilters];

    if (savedQuery.attributes.timefilter) {
      if (savedQuery.attributes.timefilter.refreshInterval) {
        this._onRefreshChange({
          isPaused: savedQuery.attributes.timefilter.refreshInterval.pause,
          refreshInterval: savedQuery.attributes.timefilter.refreshInterval.value,
        });
      }
      this._onQueryChange({
        filters: allFilters,
        query: savedQuery.attributes.query,
        time: savedQuery.attributes.timefilter,
      });
    } else {
      this._onQueryChange({
        filters: allFilters,
        query: savedQuery.attributes.query,
      });
    }
  }

  _syncStoreAndGetFilters() {
    const {
      savedMap,
      setGotoWithCenter,
      setMapSettings,
      setIsLayerTOCOpen,
      setOpenTOCDetails,
    } = this.props;
    let savedObjectFilters = [];
    if (savedMap.mapStateJSON) {
      const mapState = JSON.parse(savedMap.mapStateJSON);
      setGotoWithCenter({
        lat: mapState.center.lat,
        lon: mapState.center.lon,
        zoom: mapState.zoom,
      });
      if (mapState.filters) {
        savedObjectFilters = mapState.filters;
      }
      if (mapState.settings) {
        setMapSettings(mapState.settings);
      }
    }

    if (savedMap.uiStateJSON) {
      const uiState = JSON.parse(savedMap.uiStateJSON);
      setIsLayerTOCOpen(_.get(uiState, 'isLayerTOCOpen', DEFAULT_IS_LAYER_TOC_OPEN));
      setOpenTOCDetails(_.get(uiState, 'openTOCDetails', []));
    }
    return savedObjectFilters;
  }

  async _initMap() {
    const { clearUi, savedMap } = this.props;
    // TODO: Handle null when converting to TS
    const globalState = getGlobalState();
    this._initMapAndLayerSettings();
    clearUi();

    await this._handleStoreChanges();
    this._storeSyncUnsubscribe = subscribeToSyncStore(this._handleStoreChanges);

    const savedObjectFilters = this._syncStoreAndGetFilters(savedMap);
    await this._onQueryChange({
      filters: [
        ..._.get(globalState, 'filters', []),
        ...this._getAppStateFilters(),
        ...savedObjectFilters,
      ],
    });
    this.setState({ initialized: true });
  }

  _renderTopNav() {
    const {
      query,
      time,
      refreshConfig,
      savedQuery,
      initialLayerListConfig,
      isVisible,
      indexPatterns,
      currentPath,
    } = this.state;
    const { savedMap } = this.props;

    return isVisible ? (
      <MapsTopNavMenu
        savedMap={savedMap}
        query={query}
        savedQuery={savedQuery}
        onQueryChange={this._onQueryChange}
        time={time}
        refreshConfig={refreshConfig}
        setRefreshConfig={(newConfig, callback) => {
          this.setState(
            {
              refreshConfig: newConfig,
            },
            callback
          );
        }}
        initialLayerListConfig={initialLayerListConfig}
        indexPatterns={indexPatterns}
        updateFiltersAndDispatch={this._updateFiltersAndDispatch}
        onQuerySaved={(query) => {
          this.setState({ savedQuery: query });
          this._appStateManager.setQueryAndFilters({ savedQuery: query });
          this._updateStateFromSavedQuery(query);
        }}
        onSavedQueryUpdated={(query) => {
          this.setState({ savedQuery: { ...query } });
          this._appStateManager.setQueryAndFilters({ savedQuery: query });
          this._updateStateFromSavedQuery(query);
        }}
        syncAppAndGlobalState={this._syncAppAndGlobalState}
        currentPath={currentPath}
      />
    ) : null;
  }

  render() {
    const { filters, initialized } = this.state;

    return initialized ? (
      <div id="maps-plugin" className={this.props.isFullScreen ? 'mapFullScreen' : ''}>
        {this._renderTopNav()}
        <h1 className="euiScreenReaderOnly">{`screenTitle placeholder`}</h1>
        <MapsRoot filters={filters} updateFiltersAndDispatch={this._updateFiltersAndDispatch} />
      </div>
    ) : null;
  }
};
