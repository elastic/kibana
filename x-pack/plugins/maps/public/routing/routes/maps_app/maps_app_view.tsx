/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import _ from 'lodash';
import { AppLeaveAction, AppMountParameters } from 'kibana/public';
import { EmbeddableStateTransfer, Adapters } from 'src/plugins/embeddable/public';
import { Subscription } from 'rxjs';
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
  MapsGlobalState,
} from '../../state_syncing/global_sync';
import { AppStateManager } from '../../state_syncing/app_state_manager';
import { startAppStateSyncing } from '../../state_syncing/app_sync';
import {
  esFilters,
  Filter,
  Query,
  TimeRange,
  IndexPattern,
  SavedQuery,
  QueryStateChange,
  QueryState,
} from '../../../../../../../src/plugins/data/public';
import { MapContainer } from '../../../connected_components/map_container';
import { getIndexPatternsFromIds } from '../../../index_pattern_util';
import { getTopNavConfig } from './top_nav_config';
import { getBreadcrumbs, unsavedChangesTitle, unsavedChangesWarning } from './get_breadcrumbs';
import {
  LayerDescriptor,
  MapRefreshConfig,
  MapCenterAndZoom,
  MapQuery,
} from '../../../../common/descriptor_types';
import { MapSettings } from '../../../reducers/map';
import { ISavedGisMap } from '../../bootstrap/services/saved_gis_map';

interface Props {
  savedMap: ISavedGisMap;
  onAppLeave: AppMountParameters['onAppLeave'];
  stateTransfer: EmbeddableStateTransfer;
  originatingApp?: string;
  layerListConfigOnly: LayerDescriptor[];
  replaceLayerList: (layerList: LayerDescriptor[]) => void;
  filters: Filter[];
  isFullScreen: boolean;
  isOpenSettingsDisabled: boolean;
  enableFullScreen: () => void;
  openMapSettings: () => void;
  inspectorAdapters: Adapters;
  nextIndexPatternIds: string[];
  dispatchSetQuery: ({
    forceRefresh,
    filters,
    query,
    timeFilters,
  }: {
    filters?: Filter[];
    query?: Query;
    timeFilters?: TimeRange;
    forceRefresh?: boolean;
  }) => void;
  timeFilters: TimeRange;
  refreshConfig: MapRefreshConfig;
  setRefreshConfig: (refreshConfig: MapRefreshConfig) => void;
  isSaveDisabled: boolean;
  clearUi: () => void;
  setGotoWithCenter: (latLonZoom: MapCenterAndZoom) => void;
  setMapSettings: (mapSettings: MapSettings) => void;
  setIsLayerTOCOpen: (isLayerTOCOpen: boolean) => void;
  setOpenTOCDetails: (openTOCDetails: string[]) => void;
  query: MapQuery | undefined;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

interface State {
  initialized: boolean;
  initialLayerListConfig?: LayerDescriptor[];
  indexPatterns: IndexPattern[];
  savedQuery?: SavedQuery;
  originatingApp?: string;
}

export class MapsAppView extends React.Component<Props, State> {
  _globalSyncUnsubscribe: (() => void) | null = null;
  _globalSyncChangeMonitorSubscription: Subscription | null = null;
  _appSyncUnsubscribe: (() => void) | null = null;
  _appStateManager = new AppStateManager();
  _prevIndexPatternIds: string[] | null = null;
  _isMounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      indexPatterns: [],
      initialized: false,
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

    // savedQuery must be fetched from savedQueryId
    // const initialSavedQuery = this._appStateManager.getAppState().savedQuery;
    // if (initialSavedQuery) {
    //   this._updateStateFromSavedQuery(initialSavedQuery as SavedQuery);
    // }

    this._initMap();

    this._setBreadcrumbs();

    this.props.onAppLeave((actions) => {
      if (this._hasUnsavedChanges()) {
        return actions.confirm(unsavedChangesWarning, unsavedChangesTitle);
      }
      return actions.default() as AppLeaveAction;
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

  _updateFromGlobalState = ({
    changes,
    state: globalState,
  }: {
    changes: QueryStateChange;
    state: QueryState;
  }) => {
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

  _onQueryChange = ({
    filters,
    query,
    time,
    forceRefresh = false,
  }: {
    filters?: Filter[];
    query?: Query;
    time?: TimeRange;
    forceRefresh?: boolean;
  }) => {
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
    const updatedGlobalState: MapsGlobalState = {
      filters: filterManager.getGlobalFilters(),
    };
    if (time) {
      updatedGlobalState.time = time;
    }
    updateGlobalState(updatedGlobalState, !this.state.initialized);
  };

  _initMapAndLayerSettings() {
    const globalState: MapsGlobalState = getGlobalState();
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

  _onFiltersChange = (filters: Filter[]) => {
    this._onQueryChange({
      filters,
    });
  };

  // mapRefreshConfig: MapRefreshConfig
  _onRefreshConfigChange(mapRefreshConfig: MapRefreshConfig) {
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

  _updateStateFromSavedQuery = (savedQuery: SavedQuery) => {
    this.setState({ savedQuery: { ...savedQuery } });
    this._appStateManager.setQueryAndFilters({ savedQueryId: savedQuery.id });

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
        setMenuMountPoint={this.props.setHeaderActionMenu}
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
        onRefreshChange={({
          isPaused,
          refreshInterval,
        }: {
          isPaused: boolean;
          refreshInterval: number;
        }) => {
          this._onRefreshConfigChange({
            isPaused,
            interval: refreshInterval,
          });
        }}
        showSearchBar={true}
        showFilterBar={true}
        showDatePicker={true}
        showSaveQuery={!!getMapsCapabilities().saveQuery}
        savedQuery={this.state.savedQuery}
        onSaved={this._updateStateFromSavedQuery}
        onSavedQueryUpdated={this._updateStateFromSavedQuery}
        onClearSavedQuery={() => {
          const { filterManager, queryString } = getData().query;
          this.setState({ savedQuery: undefined });
          this._appStateManager.setQueryAndFilters({ savedQueryId: '' });
          this._onQueryChange({
            filters: filterManager.getGlobalFilters(),
            query: queryString.getDefaultQuery(),
          });
        }}
      />
    );
  }

  _addFilter = async (newFilters: Filter[]) => {
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
          <MapContainer
            addFilters={this._addFilter}
            title={this.props.savedMap.title}
            description={this.props.savedMap.description}
          />
        </div>
      </div>
    ) : null;
  }
}
