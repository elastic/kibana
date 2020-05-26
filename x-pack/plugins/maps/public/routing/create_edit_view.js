/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { withRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { GisMap } from '../connected_components/gis_map';
import { createMapStore } from '../reducers/store';
import 'mapbox-gl/dist/mapbox-gl.css';
import _ from 'lodash';
import {
  setSelectedLayer,
  setRefreshConfig,
  setGotoWithCenter,
  replaceLayerList,
  setMapSettings,
  setQuery,
} from '../actions/map_actions';
import { DEFAULT_IS_LAYER_TOC_OPEN, FLYOUT_STATE } from '../reducers/ui';
import {
  updateFlyout,
  setReadOnly,
  setIsLayerTOCOpen,
  setOpenTOCDetails,
} from '../actions/ui_actions';
import { getFlyoutDisplay, getIsFullScreen } from '../selectors/ui_selectors';
import { getQueryableUniqueIndexPatternIds, hasDirtyState } from '../selectors/map_selectors';
import {
  getIndexPatternService,
  getMapsCapabilities,
  getToasts,
  getData,
  getUiSettings,
} from '../kibana_services';
import { copyPersistentState } from '../reducers/util';
import { getInitialLayers } from '../angular/get_initial_layers';
import rison from 'rison-node';
import { getInitialTimeFilters } from '../angular/get_initial_time_filters';
import { getInitialRefreshConfig } from '../angular/get_initial_refresh_config';
import { getInitialQuery } from '../angular/get_initial_query';
import {getMapsSavedObjectLoader} from "../angular/services/gis_map_saved_object_loader";

export const MapsCreateEditView = withRouter(class extends React.Component {
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
    };
  }

  componentDidMount() {
    const { savedMapId } = this.props.match.params;
    this.initMap(savedMapId);
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
    const getIndexPatternPromises = nextIndexPatternIds.map(async indexPatternId => {
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
    const { store, prevIndexPatternIds } = this.state;
    const nextIsFullScreen = getIsFullScreen(store.getState());
    if (nextIsFullScreen !== $scope.isFullScreen) {
      // Must trigger digest cycle for angular top nav to redraw itself when isFullScreen changes
      $scope.$evalAsync(() => {
        $scope.isFullScreen = nextIsFullScreen;
      });
    }

    const nextIndexPatternIds = getQueryableUniqueIndexPatternIds(store.getState());
    if (nextIndexPatternIds !== prevIndexPatternIds) {
      this.setState({
        prevIndexPatternIds: nextIndexPatternIds,
      });
      await this.updateIndexPatterns(nextIndexPatternIds);
    }

    const nextIsSaveDisabled = hasDirtyState(store.getState());
    if (nextIsSaveDisabled !== $scope.isSaveDisabled) {
      $scope.$evalAsync(() => {
        $scope.isSaveDisabled = nextIsSaveDisabled;
      });
    }

    const flyoutDisplay = getFlyoutDisplay(store.getState());
    const nextIsOpenSettingsDisabled = flyoutDisplay !== FLYOUT_STATE.NONE;
    if (nextIsOpenSettingsDisabled !== $scope.isOpenSettingsDisabled) {
      $scope.$evalAsync(() => {
        $scope.isOpenSettingsDisabled = nextIsOpenSettingsDisabled;
      });
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

  async onQueryChange({ filters, query, time, refresh }) {
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
  }

  async _fetchSavedMap(savedObjectId) {
    const savedObjectLoader = getMapsSavedObjectLoader();
    return await savedObjectLoader.get(savedObjectId);
  }

  getSavedMapFilters(savedMap) {
    const { globalState, mapsAppState } = this.props;
    return {
      query: getInitialQuery({
        mapStateJSON: savedMap.mapStateJSON,
        appState: mapsAppState,
        userQueryLanguage: getUiSettings().get('search:queryLanguage'),
      }),
      time: getInitialTimeFilters({
        mapStateJSON: savedMap.mapStateJSON,
        globalState: globalState,
      }),
      refreshConfig: getInitialRefreshConfig({
        mapStateJSON: savedMap.mapStateJSON,
        globalState: globalState,
      }),
    };
  }

  async initMap(savedMapId) {
    let unsubscribe;
    const { store, refreshConfig } = this.state;
    const { globalState } = this.props;

    let savedMap;
    let savedMapFilters = {};
    if (savedMapId) {
      savedMap = await this._fetchSavedMap(savedMapId);
      savedMapFilters = this.getSavedMapFilters(savedMap);
    }
    const layerList = getInitialLayers(savedMap.layerListJSON, this.getInitialLayersFromUrlParam());
    // Update state
    this.state = {
      ...this.state,
      ...savedMapFilters,
      initialLayerListConfig: copyPersistentState(layerList),
      layerList
    };

    // clear old UI state
    store.dispatch(setSelectedLayer(null));
    store.dispatch(updateFlyout(FLYOUT_STATE.NONE));
    store.dispatch(setReadOnly(!getMapsCapabilities().save));

    // TODO: Handle store changes
    // await this.handleStoreChanges();
    // unsubscribe = store.subscribe(async () => {
    //   await this.handleStoreChanges(store);
    // });

    // sync store with savedMap mapState
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

    store.dispatch(replaceLayerList(layerList));
    store.dispatch(setRefreshConfig(refreshConfig));

    const initialFilters = [
      ..._.get(globalState, 'filters', []),
      ...this.getAppStateFilters(),
      ...savedObjectFilters,
    ];
    await this.onQueryChange({ filters: initialFilters });
  }

  render() {
    const { store } = this.state;
    return (
      <Provider store={store}>
        <GisMap addFilters={null} />
      </Provider>
    );
  }
});

MapsCreateEditView.defaultProps = {
  mapsAppState: {},
  localStorage: {},
  globalState: {},
};
