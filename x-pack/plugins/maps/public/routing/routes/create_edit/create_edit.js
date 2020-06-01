/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { GisMap } from '../../../connected_components/gis_map';
import 'mapbox-gl/dist/mapbox-gl.css';
import _ from 'lodash';
import { DEFAULT_IS_LAYER_TOC_OPEN, FLYOUT_STATE } from '../../../reducers/ui';
import {
  getIndexPatternService,
  getMapsCapabilities,
  getToasts,
  getData,
  getUiSettings,
  getCoreChrome,
} from '../../../kibana_services';
import { copyPersistentState } from '../../../reducers/util';
import { getInitialLayers } from '../../../angular/get_initial_layers';
import rison from 'rison-node';
import { getInitialTimeFilters } from '../../../angular/get_initial_time_filters';
import { getInitialRefreshConfig } from '../../../angular/get_initial_refresh_config';
import { getInitialQuery } from '../../../angular/get_initial_query';
import { getMapsSavedObjectLoader } from '../../../angular/services/gis_map_saved_object_loader';
import { MapsTopNavMenu } from '../../page_elements/top_nav_menu';
import {
  getGlobalState,
  updateGlobalState,
  useGlobalStateSyncing,
} from '../../state_syncing/global_sync';
import { esFilters } from '../../../../../../../src/plugins/data/public';
import { AppStateManager } from '../../state_syncing/app_state_manager';
import { useAppStateSyncing } from '../../state_syncing/app_sync';
import { getStoreSyncSubscription } from '../../store_operations';

export const MapsCreateEditView = class extends React.Component {
  visibleSubscription = null;
  storeSyncUnsubscribe = null;
  globalSyncUnsubscribe = null;
  appSyncUnsubscribe = null;
  appStateManager = new AppStateManager();

  constructor(props) {
    super(props);
    this.state = {
      indexPatterns: [],
      prevIndexPatternIds: [],
      filters: [],
      showSaveQuery: getMapsCapabilities().saveQuery,
      layerList: [],
      initialized: false,
      isVisible: true,
      isSaveDisabled: false,
      isOpenSettingsDisabled: false,
      isFullScreen: false,
      savedQuery: null,
    };
  }

  componentDidMount() {
    const { match, kbnUrlStateStorage } = this.props;

    // Init sync utils
    this.globalSyncUnsubscribe = useGlobalStateSyncing(kbnUrlStateStorage);
    this.appSyncUnsubscribe = useAppStateSyncing(this.appStateManager, kbnUrlStateStorage);

    // Monitor visibility
    this.visibleSubscription = getCoreChrome()
      .getIsVisible$()
      .subscribe((isVisible) => this.setState({ isVisible }));

    const { savedMapId } = match.params;
    this.initMap(savedMapId);
  }

  componentWillUnmount() {
    if (this.storeSyncUnsubscribe) {
      this.storeSyncUnsubscribe();
    }
    if (this.globalSyncUnsubscribe) {
      this.globalSyncUnsubscribe();
    }
    if (this.appSyncUnsubscribe) {
      this.appSyncUnsubscribe();
    }
    if (this.visibleSubscription) {
      this.visibleSubscription.unsubscribe();
    }
  }

  getInitialLayersFromUrlParam() {
    const locationSplit = window.location.href.split('?');
    if (locationSplit.length <= 1) {
      return [];
    }
    const mapAppParams = new URLSearchParams(locationSplit[1]);
    if (!mapAppParams.has('initialLayers')) {
      return [];
    }

    try {
      return rison.decode_array(mapAppParams.get('initialLayers'));
    } catch (e) {
      getToasts().addWarning({
        title: i18n.translate('xpack.maps.initialLayers.unableToParseTitle', {
          defaultMessage: `Inital layers not added to map`,
        }),
        text: i18n.translate('xpack.maps.initialLayers.unableToParseMessage', {
          defaultMessage: `Unable to parse contents of 'initialLayers' parameter. Error: {errorMsg}`,
          values: { errorMsg: e.message },
        }),
      });
      return [];
    }
  }

  async updateIndexPatterns(nextIndexPatternIds) {
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

  handleStoreChanges = async () => {
    const {
      prevIndexPatternIds,
      isSaveDisabled,
      isOpenSettingsDisabled,
      isFullScreen,
    } = this.state;
    const { nextIsFullScreen, nextIndexPatternIds, nextIsSaveDisabled, flyoutDisplay } = this.props;
    const storeUpdates = {};

    if (nextIsFullScreen !== isFullScreen) {
      storeUpdates.isFullScreen = nextIsFullScreen;
    }

    if (nextIndexPatternIds !== prevIndexPatternIds) {
      storeUpdates.prevIndexPatternIds = nextIndexPatternIds;
      await this.updateIndexPatterns(nextIndexPatternIds);
    }

    if (nextIsSaveDisabled !== isSaveDisabled) {
      storeUpdates.isSaveDisabled = nextIsSaveDisabled;
    }

    const nextIsOpenSettingsDisabled = flyoutDisplay !== FLYOUT_STATE.NONE;
    if (nextIsOpenSettingsDisabled !== isOpenSettingsDisabled) {
      storeUpdates.isOpenSettingsDisabled = nextIsOpenSettingsDisabled;
    }
    if (!_.isEmpty(storeUpdates)) {
      this.setState(storeUpdates);
    }
  };

  getAppStateFilters() {
    return this.appStateManager.getFilters() || [];
  }

  syncAppAndGlobalState() {
    const { query, time, refreshConfig } = this.state;
    const { kbnUrlStateStorage } = this.props;
    const { filterManager } = getData().query;

    // appState
    this.appStateManager.setQueryAndFilters({
      query: query,
      filters: filterManager.getAppFilters(),
    });

    // globalState
    updateGlobalState(kbnUrlStateStorage, {
      time: time,
      refreshInterval: {
        pause: refreshConfig.isPaused,
        value: refreshConfig.interval,
      },
      filters: filterManager.getGlobalFilters(),
    });
  }

  onQueryChange = async ({ filters, query, time, refresh }) => {
    const { filterManager } = getData().query;
    const { kbnUrlStateStorage, dispatchSetQuery } = this.props;
    const newState = {};
    if (filters) {
      filterManager.setFilters(filters); // Maps and merges filters
      newState.filters = filterManager.getFilters();
    }
    if (query) {
      newState.query = query;
    }
    if (time) {
      newState.time = time;
    }
    this.syncAppAndGlobalState();
    dispatchSetQuery(
      refresh,
      filters || this.state.filters,
      query || this.state.query,
      time || this.state.time
    );
    updateGlobalState(kbnUrlStateStorage, newState);
    this.setState(newState);
  };

  async _fetchSavedMap(savedObjectId) {
    const savedObjectLoader = getMapsSavedObjectLoader();
    return await savedObjectLoader.get(savedObjectId);
  }

  initFilters(savedMap) {
    const { setRefreshConfig, kbnUrlStateStorage } = this.props;
    const globalState = getGlobalState(kbnUrlStateStorage);
    const mapStateJSON = savedMap ? savedMap.mapStateJSON : undefined;
    const query = getInitialQuery({
      mapStateJSON,
      appState: this.appStateManager.getAppState(),
      userQueryLanguage: getUiSettings().get('search:queryLanguage'),
    });
    const time = getInitialTimeFilters({
      mapStateJSON,
      globalState,
    });
    const refreshConfig = getInitialRefreshConfig({
      mapStateJSON,
      globalState,
    });
    this.setState({ query, time, refreshConfig });
    setRefreshConfig(refreshConfig);
  }

  async initMapAndLayerSettings(savedMapId) {
    // Get saved map & layer settings
    let layerList;
    const savedMap = await this._fetchSavedMap(savedMapId);
    this.initFilters(savedMap);
    if (savedMap.layerListJSON) {
      layerList = JSON.parse(savedMap.layerListJSON);
    } else {
      layerList = getInitialLayers(this.getInitialLayersFromUrlParam());
    }
    this.props.replaceLayerList(layerList);
    this.setState({
      initialLayerListConfig: copyPersistentState(layerList),
      savedMap,
    });
    return savedMap;
  }

  updateFiltersAndDispatch = (filters) => {
    this.onQueryChange({
      filters,
    });
  };

  addFilters(newFilters) {
    newFilters.forEach((filter) => {
      filter.$state = { store: esFilters.FilterStateStore.APP_STATE };
    });
    this.updateFiltersAndDispatch([...this.state.filters, ...newFilters]);
  }

  onRefreshChange = ({ isPaused, refreshInterval }) => {
    const { refreshConfig } = this.state;
    this.setState({
      refreshConfig: {
        isPaused,
        interval: refreshInterval ? refreshInterval : refreshConfig.interval,
      },
    });
    this.syncAppAndGlobalState();
    this.props.setRefreshConfig(refreshConfig);
  };

  updateStateFromSavedQuery(savedQuery) {
    const { filterManager } = getData().query;
    const savedQueryFilters = savedQuery.attributes.filters || [];
    const globalFilters = filterManager.getGlobalFilters();
    const allFilters = [...savedQueryFilters, ...globalFilters];

    if (savedQuery.attributes.timefilter) {
      if (savedQuery.attributes.timefilter.refreshInterval) {
        this.onRefreshChange({
          isPaused: savedQuery.attributes.timefilter.refreshInterval.pause,
          refreshInterval: savedQuery.attributes.timefilter.refreshInterval.value,
        });
      }
      this.onQueryChange({
        filters: allFilters,
        query: savedQuery.attributes.query,
        time: savedQuery.attributes.timefilter,
      });
    } else {
      this.onQueryChange({
        filters: allFilters,
        query: savedQuery.attributes.query,
      });
    }
  }

  syncStoreAndGetFilters(savedMap) {
    const { setGotoWithCenter, setMapSettings, setIsLayerTOCOpen, setOpenTOCDetails } = this.props;
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

  async initMap(savedMapId) {
    const { kbnUrlStateStorage, clearUi } = this.props;
    const globalState = getGlobalState(kbnUrlStateStorage);
    const savedMap = await this.initMapAndLayerSettings(savedMapId);
    clearUi();

    await this.handleStoreChanges();
    this.storeSyncUnsubscribe = getStoreSyncSubscription(this.handleStoreChanges);

    const savedObjectFilters = this.syncStoreAndGetFilters(savedMap);
    await this.onQueryChange({
      filters: [
        ..._.get(globalState, 'filters', []),
        ...this.getAppStateFilters(),
        ...savedObjectFilters,
      ],
    });
  }

  render() {
    const {
      query,
      time,
      refreshConfig,
      savedMap,
      initialLayerListConfig,
      isVisible,
      isFullScreen,
      indexPatterns,
      isSaveDisabled,
    } = this.state;
    const initialized = !!query && !!time && !!refreshConfig;
    return (
      <div id="maps-plugin" className={isFullScreen ? 'mapFullScreen' : ''}>
        {initialized ? (
          <MapsTopNavMenu
            savedMap={savedMap}
            query={query}
            onQueryChange={this.onQueryChange}
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
            isVisible={isVisible}
            indexPatterns={indexPatterns}
            updateFiltersAndDispatch={this.updateFiltersAndDispatch}
            onQuerySaved={(query) => {
              this.setState({ savedQuery: query });
              this.appStateManager.setQueryAndFilters({ savedQuery: query });
              this.updateStateFromSavedQuery(query);
            }}
            onSavedQueryUpdated={(query) => {
              this.setState({ savedQuery: { ...query } });
              this.appStateManager.setQueryAndFilters({ savedQuery: query });
              this.updateStateFromSavedQuery(query);
            }}
            isSaveDisabled={isSaveDisabled}
          />
        ) : null}
        <h1 className="euiScreenReaderOnly">{`screenTitle placeholder`}</h1>
        <div id="react-maps-root">
          <GisMap addFilters={this.addFilters} />
        </div>
      </div>
    );
  }
};
