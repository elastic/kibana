/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { GisMap } from '../../connected_components/gis_map';
import { createMapStore } from '../../reducers/store';
import 'mapbox-gl/dist/mapbox-gl.css';
import _ from 'lodash';
import {
  setSelectedLayer,
  setRefreshConfig,
  setGotoWithCenter,
  replaceLayerList,
  setMapSettings,
  setQuery,
  updateFlyout,
  setReadOnly,
  setIsLayerTOCOpen,
  setOpenTOCDetails,
} from '../../actions';
import { DEFAULT_IS_LAYER_TOC_OPEN, FLYOUT_STATE } from '../../reducers/ui';
import { getFlyoutDisplay, getIsFullScreen } from '../../selectors/ui_selectors';
import { getQueryableUniqueIndexPatternIds, hasDirtyState } from '../../selectors/map_selectors';
import {
  getIndexPatternService,
  getMapsCapabilities,
  getToasts,
  getData,
  getUiSettings,
  getCoreChrome,
} from '../../kibana_services';
import { copyPersistentState } from '../../reducers/util';
import { getInitialLayers } from '../../angular/get_initial_layers';
import rison from 'rison-node';
import { getInitialTimeFilters } from '../../angular/get_initial_time_filters';
import { getInitialRefreshConfig } from '../../angular/get_initial_refresh_config';
import { getInitialQuery } from '../../angular/get_initial_query';
import { getMapsSavedObjectLoader } from '../../angular/services/gis_map_saved_object_loader';
import { MapsTopNavMenu } from '../page_elements/top_nav_menu';

export const MapsCreateEditView = withRouter(
  class extends React.Component {
    visibleSubscription = null;
    unsubscribe = null;

    constructor(props) {
      super(props);
      this.state = {
        store: createMapStore(),
        prevIndexPatternIds: undefined,
        // TODO: Replace empty object w/ global state replacement
        globalState: {},
        filters: [],
        showSaveQuery: getMapsCapabilities().saveQuery,
        layerList: [],
        initialized: false,
        isVisible: true,
        isSaveDisabled: false,
        isOpenSettingsDisabled: false,
        isFullScreen: false,
      };
    }

    componentDidMount() {
      // Monitor visibility
      this.visibleSubscription = getCoreChrome()
        .getIsVisible$()
        .subscribe((isVisible) => this.setState({ isVisible }));

      const { savedMapId } = this.props.match.params;
      this.initMap(savedMapId);
    }

    componentWillUnmount() {
      if (this.unsubscribe) {
        this.unsubscribe();
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
      const { prevIndexPatternIds } = this.state;
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
      // ignore outdated results
      if (prevIndexPatternIds !== nextIndexPatternIds) {
        return;
      }
      this.setState({
        indexPatterns,
      });
    }

    async handleStoreChanges() {
      const {
        store,
        prevIndexPatternIds,
        isSaveDisabled,
        isOpenSettingsDisabled,
        isFullScreen,
      } = this.state;
      const storeUpdates = {};

      const nextIsFullScreen = getIsFullScreen(store.getState());
      if (nextIsFullScreen !== isFullScreen) {
        storeUpdates.isFullScreen = nextIsFullScreen;
      }

      const nextIndexPatternIds = getQueryableUniqueIndexPatternIds(store.getState());
      if (nextIndexPatternIds !== prevIndexPatternIds) {
        storeUpdates.prevIndexPatternIds = nextIndexPatternIds;
        await this.updateIndexPatterns(nextIndexPatternIds);
      }

      const nextIsSaveDisabled = hasDirtyState(store.getState());
      if (nextIsSaveDisabled !== isSaveDisabled) {
        storeUpdates.isSaveDisabled = nextIsSaveDisabled;
      }

      const flyoutDisplay = getFlyoutDisplay(store.getState());
      const nextIsOpenSettingsDisabled = flyoutDisplay !== FLYOUT_STATE.NONE;
      if (nextIsOpenSettingsDisabled !== isOpenSettingsDisabled) {
        storeUpdates.isOpenSettingsDisabled = nextIsOpenSettingsDisabled;
      }
      if (!_.isEmpty(storeUpdates)) {
        this.setState(storeUpdates);
      }
    }

    // TODO: Replace empty object w/ app state replacement
    getAppStateFilters() {
      return _.get({}, 'filters', []);
    }

    dispatchSetQuery(refresh) {
      const { store, filters, query, time } = this.state;
      store.dispatch(
        setQuery({
          filters,
          query,
          timeFilters: time,
          refresh,
        })
      );
    }

    onQueryChange = async ({ filters, query, time, refresh }) => {
      const { filterManager } = getData().query;
      if (filters) {
        filterManager.setFilters(filters); // Maps and merges filters
        this.setState({
          filters: filterManager.getFilters(),
        });
      }
      if (query) {
        this.setState({ query });
      }
      if (time) {
        this.setState({ time });
      }
      // this.syncAppAndGlobalState();
      this.dispatchSetQuery(refresh);
    };

    async _fetchSavedMap(savedObjectId) {
      const savedObjectLoader = getMapsSavedObjectLoader();
      return await savedObjectLoader.get(savedObjectId);
    }

    initFilters(savedMap) {
      const { globalState, mapsAppState } = this.props;
      const mapStateJSON = savedMap ? savedMap.mapStateJSON : undefined;
      const query = getInitialQuery({
        mapStateJSON,
        appState: mapsAppState,
        userQueryLanguage: getUiSettings().get('search:queryLanguage'),
      });
      const time = getInitialTimeFilters({
        mapStateJSON,
        globalState: globalState,
      });
      const refreshConfig = getInitialRefreshConfig({
        mapStateJSON,
        globalState: globalState,
      });
      this.setState({ query, time, refreshConfig });
      this.state.store.dispatch(setRefreshConfig(refreshConfig));
    }

    async initMapAndLayerSettings(savedMapId) {
      const { store } = this.state;

      // Get saved map & layer settings
      let layerList;
      const savedMap = await this._fetchSavedMap(savedMapId);
      this.initFilters(savedMap);
      if (savedMap.layerListJSON) {
        layerList = JSON.parse(savedMap.layerListJSON);
      } else {
        layerList = getInitialLayers(this.getInitialLayersFromUrlParam());
      }
      store.dispatch(replaceLayerList(layerList));
      this.setState({
        initialLayerListConfig: copyPersistentState(layerList),
        savedMap,
      });
      return savedMap;
    }

    syncStoreAndGetFilters(savedMap) {
      const { store } = this.state;
      let savedObjectFilters = [];
      if (savedMap.mapStateJSON) {
        const mapState = JSON.parse(savedMap.mapStateJSON);
        store.dispatch(
          setGotoWithCenter({
            lat: mapState.center.lat,
            lon: mapState.center.lon,
            zoom: mapState.zoom,
          })
        );
        if (mapState.filters) {
          savedObjectFilters = mapState.filters;
        }
        if (mapState.settings) {
          store.dispatch(setMapSettings(mapState.settings));
        }
      }

      if (savedMap.uiStateJSON) {
        const uiState = JSON.parse(savedMap.uiStateJSON);
        store.dispatch(
          setIsLayerTOCOpen(_.get(uiState, 'isLayerTOCOpen', DEFAULT_IS_LAYER_TOC_OPEN))
        );
        store.dispatch(setOpenTOCDetails(_.get(uiState, 'openTOCDetails', [])));
      }
      return savedObjectFilters;
    }

    clearUi() {
      const { store } = this.state;
      // clear old UI state
      store.dispatch(setSelectedLayer(null));
      store.dispatch(updateFlyout(FLYOUT_STATE.NONE));
      store.dispatch(setReadOnly(!getMapsCapabilities().save));
    }

    async initMap(savedMapId) {
      const { globalState } = this.props;
      const { store } = this.state;
      const savedMap = await this.initMapAndLayerSettings(savedMapId);
      this.clearUi();

      await this.handleStoreChanges();
      this.unsubscribe = store.subscribe(async () => {
        await this.handleStoreChanges(store);
      });

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
        store,
        query,
        time,
        refreshConfig,
        savedMap,
        initialLayerListConfig,
        isVisible,
      } = this.state;
      const initialized = !!query && !!time && !!refreshConfig;
      return (
        <div id="maps-plugin" ng-class="{mapFullScreen: isFullScreen}">
          {initialized ? (
            <MapsTopNavMenu
              savedMap={savedMap}
              store={store}
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
            />
          ) : null}
          <h1 className="euiScreenReaderOnly">{`screenTitle placeholder`}</h1>
          <div id="react-maps-root">
            <Provider store={store}>
              <GisMap addFilters={null} />
            </Provider>
          </div>
        </div>
      );
    }
  }
);

MapsCreateEditView.defaultProps = {
  mapsAppState: {},
  localStorage: {},
  globalState: {},
};
