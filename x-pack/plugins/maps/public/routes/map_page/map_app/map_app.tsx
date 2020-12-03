/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { AppLeaveAction, AppMountParameters } from 'kibana/public';
import { Adapters } from 'src/plugins/embeddable/public';
import { Subscription } from 'rxjs';
import {
  getData,
  getCoreChrome,
  getMapsCapabilities,
  getNavigation,
  getToasts,
} from '../../../kibana_services';
import {
  AppStateManager,
  startAppStateSyncing,
  getGlobalState,
  updateGlobalState,
  startGlobalStateSyncing,
  MapsGlobalState,
} from '../url_state';
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
import { getTopNavConfig } from '../top_nav_config';
import { MapRefreshConfig, MapQuery } from '../../../../common/descriptor_types';
import { goToSpecifiedPath } from '../../../render_app';
import { MapSavedObjectAttributes } from '../../../../common/map_saved_object_type';
import { getExistingMapPath } from '../../../../common/constants';
import {
  getInitialQuery,
  getInitialRefreshConfig,
  getInitialTimeFilters,
  SavedMap,
  unsavedChangesTitle,
  unsavedChangesWarning,
} from '../saved_map';

interface Props {
  savedMap: SavedMap;
  // saveCounter used to trigger MapApp render after SaveMap.save
  saveCounter: number;
  onAppLeave: AppMountParameters['onAppLeave'];
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
  query: MapQuery | undefined;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

interface State {
  initialized: boolean;
  indexPatterns: IndexPattern[];
  savedQuery?: SavedQuery;
}

export class MapApp extends React.Component<Props, State> {
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

    this.props.onAppLeave((actions) => {
      if (this.props.savedMap.hasUnsavedChanges()) {
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

    this.props.onAppLeave((actions) => {
      return actions.default();
    });
  }

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

  _initMapAndLayerSettings(mapSavedObjectAttributes: MapSavedObjectAttributes) {
    const globalState: MapsGlobalState = getGlobalState();

    let savedObjectFilters = [];
    if (mapSavedObjectAttributes.mapStateJSON) {
      const mapState = JSON.parse(mapSavedObjectAttributes.mapStateJSON);
      if (mapState.filters) {
        savedObjectFilters = mapState.filters;
      }
    }
    const appFilters = this._appStateManager.getFilters() || [];

    const query = getInitialQuery({
      mapStateJSON: mapSavedObjectAttributes.mapStateJSON,
      appState: this._appStateManager.getAppState(),
    });
    if (query) {
      getData().query.queryString.setQuery(query);
    }

    this._onQueryChange({
      filters: [..._.get(globalState, 'filters', []), ...appFilters, ...savedObjectFilters],
      query,
      time: getInitialTimeFilters({
        mapStateJSON: mapSavedObjectAttributes.mapStateJSON,
        globalState,
      }),
    });

    this._onRefreshConfigChange(
      getInitialRefreshConfig({
        mapStateJSON: mapSavedObjectAttributes.mapStateJSON,
        globalState,
      })
    );
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

  async _initMap() {
    try {
      await this.props.savedMap.whenReady();
    } catch (err) {
      if (this._isMounted) {
        getToasts().addWarning({
          title: i18n.translate('xpack.maps.loadMap.errorAttemptingToLoadSavedMap', {
            defaultMessage: `Unable to load map`,
          }),
          text: `${err.message}`,
        });
        goToSpecifiedPath('/');
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.props.savedMap.setBreadcrumbs();
    getCoreChrome().docTitle.change(this.props.savedMap.getTitle());
    const savedObjectId = this.props.savedMap.getSavedObjectId();
    if (savedObjectId) {
      getCoreChrome().recentlyAccessed.add(
        getExistingMapPath(savedObjectId),
        this.props.savedMap.getTitle(),
        savedObjectId
      );
    }

    this._initMapAndLayerSettings(this.props.savedMap.getAttributes());

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
    if (!this.state.initialized) {
      return null;
    }

    return (
      <div id="maps-plugin" className={this.props.isFullScreen ? 'mapFullScreen' : ''}>
        {this._renderTopNav()}
        <h1 className="euiScreenReaderOnly">{`screenTitle placeholder`}</h1>
        <div id="react-maps-root">
          <MapContainer
            addFilters={this._addFilter}
            title={this.props.savedMap.getAttributes().title}
            description={this.props.savedMap.getAttributes().description}
          />
        </div>
      </div>
    );
  }
}
