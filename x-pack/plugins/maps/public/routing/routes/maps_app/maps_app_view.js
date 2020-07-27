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
import { getData, getUiSettings, getCoreChrome } from '../../../kibana_services';
import { copyPersistentState } from '../../../reducers/util';
import { getInitialLayers, getInitialLayersFromUrlParam } from '../../bootstrap/get_initial_layers';
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
import { esFilters } from '../../../../../../../src/plugins/data/public';
import { GisMap } from '../../../connected_components/gis_map';
import { goToSpecifiedPath } from '../../maps_router';
import { getIndexPatternsFromIds } from '../../../index_pattern_util';

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
    // eslint-disable-next-line react-hooks/rules-of-hooks
    this._globalSyncUnsubscribe = useGlobalStateSyncing();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    this._appSyncUnsubscribe = useAppStateSyncing(this._appStateManager);
    this._globalSyncChangeMonitorSubscription = getData().query.state$.subscribe(
      this._updateFromGlobalState
    );

    const initAppState = this._appStateManager.getAppState();
    if (initAppState.savedQuery) {
      this._updateStateFromSavedQuery(initAppState.savedQuery);
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
    if (this._globalSyncUnsubscribe) {
      this._globalSyncUnsubscribe();
    }
    if (this._appSyncUnsubscribe) {
      this._appSyncUnsubscribe();
    }
    if (this._globalSyncChangeMonitorSubscription) {
      this._globalSyncChangeMonitorSubscription.unsubscribe();
    }

    // Clean up app state filters
    const { filterManager } = getData().query;
    filterManager.filters.forEach((filter) => {
      if (filter.$state.store === esFilters.FilterStateStore.APP_STATE) {
        filterManager.removeFilter(filter);
      }
    });

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
    if (!changes || !globalState) {
      return;
    }

    this._onQueryChange({ time: globalState.time, refresh: true });
  };

  async _updateIndexPatterns() {
    const { nextIndexPatternIds } = this.props;

    if (nextIndexPatternIds === this._prevIndexPatternIds) {
      return;
    }

    this._prevIndexPatternIds = nextIndexPatternIds;

    this.setState({
      indexPatterns: await getIndexPatternsFromIds(nextIndexPatternIds),
    });
  }

  _onQueryChange = ({
    filters,
    query = this.props.query,
    time = this.props.timeFilters,
    refresh = false,
  }) => {
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
      query,
      filters: filterManager.getAppFilters(),
    });

    // sync globalState
    updateGlobalState(
      {
        time,
        filters: filterManager.getGlobalFilters(),
      },
      !this.state.initialized
    );
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

    this._onQueryChange({
      filters: [..._.get(globalState, 'filters', []), ...appFilters, ...savedObjectFilters],
      query: getInitialQuery({
        mapStateJSON,
        appState: this._appStateManager.getAppState(),
        userQueryLanguage: getUiSettings().get('search:queryLanguage'),
      }),
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

  _updateStateFromSavedQuery(savedQuery) {
    if (!savedQuery) {
      this.setState({ savedQuery: '' });
      return;
    }
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
  }

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
    return !this.props.isFullScreen ? (
      <MapsTopNavMenu
        savedMap={this.props.savedMap}
        savedQuery={this.state.savedQuery}
        onQueryChange={this._onQueryChange}
        onRefreshConfigChange={this._onRefreshConfigChange}
        indexPatterns={this.state.indexPatterns}
        onFiltersChange={this._onFiltersChange}
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
        setBreadcrumbs={this._setBreadcrumbs}
      />
    ) : null;
  }

  render() {
    const { filters, isFullScreen } = this.props;

    return this.state.initialized ? (
      <div id="maps-plugin" className={isFullScreen ? 'mapFullScreen' : ''}>
        {this._renderTopNav()}
        <h1 className="euiScreenReaderOnly">{`screenTitle placeholder`}</h1>
        <div id="react-maps-root">
          <GisMap
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
