/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import _ from 'lodash';
import { DEFAULT_IS_LAYER_TOC_OPEN } from '../../../reducers/ui';
import {
  getData,
  getCoreChrome,
  getMapsCapabilities,
  getNavigation,
} from '../../../kibana_services';
import { copyPersistentState } from '../../../reducers/util';
import { getInitialLayers, getInitialLayersFromUrlParam } from '../../bootstrap/get_initial_layers';
import { getInitialTimeFilters } from '../../bootstrap/get_initial_time_filters';
import { getInitialRefreshConfig } from '../../bootstrap/get_initial_refresh_config';
import { getInitialQuery } from '../../bootstrap/get_initial_query';
import {
  getGlobalState,
  updateGlobalState,
  startGlobalStateSyncing,
} from '../../state_syncing/global_sync';
import { AppStateManager } from '../../state_syncing/app_state_manager';
import { startAppStateSyncing } from '../../state_syncing/app_sync';
import { esFilters } from '../../../../../../../src/plugins/data/public';
import { MapContainer } from '../../../connected_components/map_container';
import { getIndexPatternsFromIds } from '../../../index_pattern_util';
import { getTopNavConfig } from './top_nav_config';
import { getBreadcrumbs, unsavedChangesWarning } from './get_breadcrumbs';

export class MapsAppView extends React.Component {
  _globalSyncUnsubscribe = null;
  _globalSyncChangeMonitorSubscription = null;
  _appSyncUnsubscribe = null;
  _appStateManager = new AppStateManager();
  _prevIndexPatternIds = null;

  constructor(props) {
    super(props);
    this.state = {
      indexPatterns: [],
      initialized: false,
      savedQuery: '',
      initialLayerListConfig: null,
      // tracking originatingApp in state so the connection can be broken by users
      originatingApp: props.originatingApp,
    };
  }

  componentDidMount() {
    this._isMounted = true;

    this._globalSyncUnsubscribe = startGlobalStateSyncing();
    this._appSyncUnsubscribe = startAppStateSyncing(this._appStateManager);
    this._globalSyncChangeMonitorSubscription = getData().query.state$.subscribe(
      this._updateFromGlobalState
    );

    const initialSavedQuery = this._appStateManager.getAppState().savedQuery;
    if (initialSavedQuery) {
      this._updateStateFromSavedQuery(initialSavedQuery);
    }

    this._initMap();

    this._setBreadcrumbs();

    this.props.onAppLeave((actions) => {
      if (this._hasUnsavedChanges()) {
        if (!window.confirm(unsavedChangesWarning)) {
          return;
        }
      }
      return actions.default();
    });
  }

  componentDidUpdate() {
    this._updateIndexPatterns();
  }

  componentWillUnmount() {
    this._isMounted = false;

    if (this._globalSyncUnsubscribe) {
      this._globalSyncUnsubscribe();
    }
    if (this._appSyncUnsubscribe) {
      this._appSyncUnsubscribe();
    }
    if (this._globalSyncChangeMonitorSubscription) {
      this._globalSyncChangeMonitorSubscription.unsubscribe();
    }

    getCoreChrome().setBreadcrumbs([]);
  }

  _hasUnsavedChanges = () => {
    const savedLayerList = this.props.savedMap.getLayerList();
    return !savedLayerList
      ? !_.isEqual(this.props.layerListConfigOnly, this.state.initialLayerListConfig)
      : // savedMap stores layerList as a JSON string using JSON.stringify.
        // JSON.stringify removes undefined properties from objects.
        // savedMap.getLayerList converts the JSON string back into Javascript array of objects.
        // Need to perform the same process for layerListConfigOnly to compare apples to apples
        // and avoid undefined properties in layerListConfigOnly triggering unsaved changes.
        !_.isEqual(JSON.parse(JSON.stringify(this.props.layerListConfigOnly)), savedLayerList);
  };

  _setBreadcrumbs = () => {
    const breadcrumbs = getBreadcrumbs({
      title: this.props.savedMap.title,
      getHasUnsavedChanges: this._hasUnsavedChanges,
      originatingApp: this.state.originatingApp,
      getAppNameFromId: this.props.stateTransfer.getAppNameFromId,
    });
    getCoreChrome().setBreadcrumbs(breadcrumbs);
  };

  _updateFromGlobalState = ({ changes, state: globalState }) => {
    if (!this.state.initialized || !changes || !globalState) {
      return;
    }

    this._onQueryChange({ time: globalState.time });
  };

  async _updateIndexPatterns() {
    const { nextIndexPatternIds } = this.props;

    if (_.isEqual(nextIndexPatternIds, this._prevIndexPatternIds)) {
      return;
    }

    this._prevIndexPatternIds = nextIndexPatternIds;

    const indexPatterns = await getIndexPatternsFromIds(nextIndexPatternIds);
    if (this._isMounted) {
      this.setState({ indexPatterns });
    }
  }

  _onQueryChange = ({ filters, query, time, forceRefresh = false }) => {
    const { filterManager } = getData().query;

    if (filters) {
      filterManager.setFilters(filters);
    }

    this.props.dispatchSetQuery({
      forceRefresh,
      filters: filterManager.getFilters(),
      query,
      timeFilters: time,
    });

    // sync appState
    this._appStateManager.setQueryAndFilters({
      filters: filterManager.getAppFilters(),
      query,
    });

    // sync globalState
    const updatedGlobalState = { filters: filterManager.getGlobalFilters() };
    if (time) {
      updatedGlobalState.time = time;
    }
    updateGlobalState(updatedGlobalState, !this.state.initialized);
  };

  _initMapAndLayerSettings() {
    const globalState = getGlobalState();
    const mapStateJSON = this.props.savedMap.mapStateJSON;

    let savedObjectFilters = [];
    if (mapStateJSON) {
      const mapState = JSON.parse(mapStateJSON);
      if (mapState.filters) {
        savedObjectFilters = mapState.filters;
      }
    }
    const appFilters = this._appStateManager.getFilters() || [];

    const query = getInitialQuery({
      mapStateJSON,
      appState: this._appStateManager.getAppState(),
    });
    if (query) {
      getData().query.queryString.setQuery(query);
    }

    this._onQueryChange({
      filters: [..._.get(globalState, 'filters', []), ...appFilters, ...savedObjectFilters],
      query,
      time: getInitialTimeFilters({
        mapStateJSON,
        globalState,
      }),
    });

    this._onRefreshConfigChange(
      getInitialRefreshConfig({
        mapStateJSON,
        globalState,
      })
    );

    const layerList = getInitialLayers(
      this.props.savedMap.layerListJSON,
      getInitialLayersFromUrlParam()
    );
    this.props.replaceLayerList(layerList);
    this.setState({
      initialLayerListConfig: copyPersistentState(layerList),
    });
  }

  _onFiltersChange = (filters) => {
    this._onQueryChange({
      filters,
    });
  };

  // mapRefreshConfig: MapRefreshConfig
  _onRefreshConfigChange(mapRefreshConfig) {
    this.props.setRefreshConfig(mapRefreshConfig);
    updateGlobalState(
      {
        refreshInterval: {
          pause: mapRefreshConfig.isPaused,
          value: mapRefreshConfig.interval,
        },
      },
      !this.state.initialized
    );
  }

  _updateStateFromSavedQuery = (savedQuery) => {
    this.setState({ savedQuery: { ...savedQuery } });
    this._appStateManager.setQueryAndFilters({ savedQuery });

    const { filterManager } = getData().query;
    const savedQueryFilters = savedQuery.attributes.filters || [];
    const globalFilters = filterManager.getGlobalFilters();
    const allFilters = [...savedQueryFilters, ...globalFilters];

    const refreshInterval = _.get(savedQuery, 'attributes.timefilter.refreshInterval');
    if (refreshInterval) {
      this._onRefreshConfigChange({
        isPaused: refreshInterval.pause,
        interval: refreshInterval.value,
      });
    }
    this._onQueryChange({
      filters: allFilters,
      query: savedQuery.attributes.query,
      time: savedQuery.attributes.timefilter,
    });
  };

  _initMap() {
    this._initMapAndLayerSettings();

    this.props.clearUi();

    if (this.props.savedMap.mapStateJSON) {
      const mapState = JSON.parse(this.props.savedMap.mapStateJSON);
      this.props.setGotoWithCenter({
        lat: mapState.center.lat,
        lon: mapState.center.lon,
        zoom: mapState.zoom,
      });
      if (mapState.settings) {
        this.props.setMapSettings(mapState.settings);
      }
    }

    if (this.props.savedMap.uiStateJSON) {
      const uiState = JSON.parse(this.props.savedMap.uiStateJSON);
      this.props.setIsLayerTOCOpen(_.get(uiState, 'isLayerTOCOpen', DEFAULT_IS_LAYER_TOC_OPEN));
      this.props.setOpenTOCDetails(_.get(uiState, 'openTOCDetails', []));
    }

    this.setState({ initialized: true });
  }

  _renderTopNav() {
    if (this.props.isFullScreen) {
      return null;
    }

    const topNavConfig = getTopNavConfig({
      savedMap: this.props.savedMap,
      isOpenSettingsDisabled: this.props.isOpenSettingsDisabled,
      isSaveDisabled: this.props.isSaveDisabled,
      enableFullScreen: this.props.enableFullScreen,
      openMapSettings: this.props.openMapSettings,
      inspectorAdapters: this.props.inspectorAdapters,
      setBreadcrumbs: this._setBreadcrumbs,
      stateTransfer: this.props.stateTransfer,
      originatingApp: this.state.originatingApp,
      cutOriginatingAppConnection: () => {
        this.setState({ originatingApp: undefined });
      },
    });

    const { TopNavMenu } = getNavigation().ui;
    return (
      <TopNavMenu
        appName="maps"
        config={topNavConfig}
        indexPatterns={this.state.indexPatterns}
        filters={this.props.filters}
        query={this.props.query}
        onQuerySubmit={({ dateRange, query }) => {
          this._onQueryChange({
            query,
            time: dateRange,
            forceRefresh: true,
          });
        }}
        onFiltersUpdated={this._onFiltersChange}
        dateRangeFrom={this.props.timeFilters.from}
        dateRangeTo={this.props.timeFilters.to}
        isRefreshPaused={this.props.refreshConfig.isPaused}
        refreshInterval={this.props.refreshConfig.interval}
        onRefreshChange={({ isPaused, refreshInterval }) => {
          this._onRefreshConfigChange({
            isPaused,
            interval: refreshInterval,
          });
        }}
        showSearchBar={true}
        showFilterBar={true}
        showDatePicker={true}
        showSaveQuery={getMapsCapabilities().saveQuery}
        savedQuery={this.state.savedQuery}
        onSaved={this._updateStateFromSavedQuery}
        onSavedQueryUpdated={this._updateStateFromSavedQuery}
        onClearSavedQuery={() => {
          const { filterManager, queryString } = getData().query;
          this.setState({ savedQuery: '' });
          this._appStateManager.setQueryAndFilters({ savedQuery: '' });
          this._onQueryChange({
            filters: filterManager.getGlobalFilters(),
            query: queryString.getDefaultQuery(),
          });
        }}
      />
    );
  }

  _addFilter = (newFilters) => {
    newFilters.forEach((filter) => {
      filter.$state = { store: esFilters.FilterStateStore.APP_STATE };
    });
    this._onFiltersChange([...this.props.filters, ...newFilters]);
  };

  render() {
    return this.state.initialized ? (
      <div id="maps-plugin" className={this.props.isFullScreen ? 'mapFullScreen' : ''}>
        {this._renderTopNav()}
        <h1 className="euiScreenReaderOnly">{`screenTitle placeholder`}</h1>
        <div id="react-maps-root">
          <MapContainer addFilters={this._addFilter} />
        </div>
      </div>
    ) : null;
  }
}
