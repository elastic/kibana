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
import { goToSpecifiedPath } from '../../maps_router';
import { getIndexPatternsFromIds } from '../../../index_pattern_util';
import { getTopNavConfig } from './top_nav_config';

const unsavedChangesWarning = i18n.translate('xpack.maps.breadCrumbs.unsavedChangesWarning', {
  defaultMessage: 'Your map has unsaved changes. Are you sure you want to leave?',
});

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

  _hasUnsavedChanges() {
    return this.props.hasUnsavedChanges(this.props.savedMap, this.state.initialLayerListConfig);
  }

  _setBreadcrumbs = () => {
    getCoreChrome().setBreadcrumbs([
      {
        text: i18n.translate('xpack.maps.mapController.mapsBreadcrumbLabel', {
          defaultMessage: 'Maps',
        }),
        onClick: () => {
          if (this._hasUnsavedChanges()) {
            const navigateAway = window.confirm(unsavedChangesWarning);
            if (navigateAway) {
              goToSpecifiedPath('/');
            }
          } else {
            goToSpecifiedPath('/');
          }
        },
      },
      { text: this.props.savedMap.title },
    ]);
  };

  _updateFromGlobalState = ({ changes, state: globalState }) => {
    if (!this.state.initialized || !changes || !globalState) {
      return;
    }

    this._onQueryChange({ time: globalState.time, refresh: true });
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

  _onQueryChange = ({ filters, query, time, refresh = false }) => {
    const { filterManager } = getData().query;

    if (filters) {
      filterManager.setFilters(filters);
    }

    this.props.dispatchSetQuery({
      refresh,
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
      closeFlyout: this.props.closeFlyout,
      enableFullScreen: this.props.enableFullScreen,
      openMapSettings: this.props.openMapSettings,
      inspectorAdapters: this.props.inspectorAdapters,
      setBreadcrumbs: this._setBreadcrumbs,
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
            refresh: true,
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

  render() {
    const { filters, isFullScreen } = this.props;

    return this.state.initialized ? (
      <div id="maps-plugin" className={isFullScreen ? 'mapFullScreen' : ''}>
        {this._renderTopNav()}
        <h1 className="euiScreenReaderOnly">{`screenTitle placeholder`}</h1>
        <div id="react-maps-root">
          <MapContainer
            addFilters={(newFilters) => {
              newFilters.forEach((filter) => {
                filter.$state = { store: esFilters.FilterStateStore.APP_STATE };
              });
              this._onFiltersChange([...filters, ...newFilters]);
            }}
          />
        </div>
      </div>
    ) : null;
  }
}
