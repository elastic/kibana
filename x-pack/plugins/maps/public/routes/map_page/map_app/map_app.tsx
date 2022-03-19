/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import _ from 'lodash';
import { finalize, switchMap, tap } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { AppLeaveAction, AppMountParameters } from 'kibana/public';
import { Adapters } from 'src/plugins/embeddable/public';
import { Subscription } from 'rxjs';
import { type Filter, FilterStateStore } from '@kbn/es-query';
import type { Query, TimeRange, DataView } from 'src/plugins/data/common';
import {
  getData,
  getExecutionContext,
  getCoreChrome,
  getMapsCapabilities,
  getNavigation,
  getSpacesApi,
  getTimeFilter,
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
  SavedQuery,
  QueryStateChange,
  QueryState,
} from '../../../../../../../src/plugins/data/public';
import { MapContainer } from '../../../connected_components/map_container';
import { getIndexPatternsFromIds } from '../../../index_pattern_util';
import { getTopNavConfig } from '../top_nav_config';
import { goToSpecifiedPath } from '../../../render_app';
import { getEditPath, getFullPath, APP_ID } from '../../../../common/constants';
import { getMapEmbeddableDisplayName } from '../../../../common/i18n_getters';
import {
  getInitialQuery,
  getInitialRefreshConfig,
  getInitialTimeFilters,
  SavedMap,
  unsavedChangesTitle,
  unsavedChangesWarning,
} from '../saved_map';
import { waitUntilTimeLayersLoad$ } from './wait_until_time_layers_load';
import { RefreshConfig as MapRefreshConfig, SerializedMapState } from '../saved_map';

export interface Props {
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
  setQuery: ({
    forceRefresh,
    filters,
    query,
    timeFilters,
    searchSessionId,
  }: {
    filters?: Filter[];
    query?: Query;
    timeFilters?: TimeRange;
    forceRefresh?: boolean;
    searchSessionId?: string;
  }) => void;
  timeFilters: TimeRange;
  isSaveDisabled: boolean;
  query: Query | undefined;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  history: AppMountParameters['history'];
}

export interface State {
  initialized: boolean;
  indexPatterns: DataView[];
  savedQuery?: SavedQuery;
  isRefreshPaused: boolean;
  refreshInterval: number;
}

export class MapApp extends React.Component<Props, State> {
  _autoRefreshSubscription: Subscription | null = null;
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
      isRefreshPaused: true,
      refreshInterval: 0,
    };
  }

  componentDidMount() {
    this._isMounted = true;

    getExecutionContext().set({
      type: 'application',
      page: 'editor',
      id: this.props.savedMap.getSavedObjectId() || 'new',
    });

    this._autoRefreshSubscription = getTimeFilter()
      .getAutoRefreshFetch$()
      .pipe(
        tap(() => {
          this.props.setQuery({ forceRefresh: true });
        }),
        switchMap((done) =>
          waitUntilTimeLayersLoad$(this.props.savedMap.getStore()).pipe(finalize(done))
        )
      )
      .subscribe();

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

    if (this._autoRefreshSubscription) {
      this._autoRefreshSubscription.unsubscribe();
    }
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
  }: {
    filters?: Filter[];
    query?: Query;
    time?: TimeRange;
  }) => {
    const { filterManager } = getData().query;

    if (filters) {
      filterManager.setFilters(filters);
    }

    this.props.setQuery({
      forceRefresh: false,
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

  _initMapAndLayerSettings(serializedMapState?: SerializedMapState) {
    const globalState: MapsGlobalState = getGlobalState();

    const savedObjectFilters = serializedMapState?.filters ? serializedMapState.filters : [];
    const appFilters = this._appStateManager.getFilters() || [];

    const query = getInitialQuery({
      serializedMapState,
      appState: this._appStateManager.getAppState(),
    });
    if (query) {
      getData().query.queryString.setQuery(query);
    }

    this._onQueryChange({
      filters: [..._.get(globalState, 'filters', []), ...appFilters, ...savedObjectFilters],
      query,
      time: getInitialTimeFilters({
        serializedMapState,
        globalState,
      }),
    });

    this._onRefreshConfigChange(
      getInitialRefreshConfig({
        serializedMapState,
        globalState,
      })
    );
  }

  _onFiltersChange = (filters: Filter[]) => {
    this._onQueryChange({
      filters,
    });
  };

  _onRefreshConfigChange({ isPaused, interval }: MapRefreshConfig) {
    this.setState({
      isRefreshPaused: isPaused,
      refreshInterval: interval,
    });
    updateGlobalState(
      {
        refreshInterval: {
          pause: isPaused,
          value: interval,
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

    const sharingSavedObjectProps = this.props.savedMap.getSharingSavedObjectProps();
    const spaces = getSpacesApi();
    if (spaces && sharingSavedObjectProps?.outcome === 'aliasMatch') {
      // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
      const newObjectId = sharingSavedObjectProps.aliasTargetId!; // This is always defined if outcome === 'aliasMatch'
      const newPath = `${getEditPath(newObjectId)}${this.props.history.location.hash}`;
      await spaces.ui.redirectLegacyUrl({
        path: newPath,
        aliasPurpose: sharingSavedObjectProps.aliasPurpose,
        objectNoun: getMapEmbeddableDisplayName(),
      });
      return;
    }

    this.props.savedMap.setBreadcrumbs();
    getCoreChrome().docTitle.change(this.props.savedMap.getTitle());
    const savedObjectId = this.props.savedMap.getSavedObjectId();
    if (savedObjectId) {
      getCoreChrome().recentlyAccessed.add(
        getFullPath(savedObjectId),
        this.props.savedMap.getTitle(),
        savedObjectId
      );
    }

    let serializedMapState: SerializedMapState | undefined;
    try {
      const attributes = this.props.savedMap.getAttributes();
      if (attributes.mapStateJSON) {
        serializedMapState = JSON.parse(attributes.mapStateJSON);
      }
    } catch (e) {
      // ignore malformed mapStateJSON, not a critical error for viewing map - map will just use defaults
    }
    this._initMapAndLayerSettings(serializedMapState);

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
        appName={APP_ID}
        config={topNavConfig}
        indexPatterns={this.state.indexPatterns}
        filters={this.props.filters}
        query={this.props.query}
        onQuerySubmit={({ dateRange, query }) => {
          const isUpdate =
            !_.isEqual(dateRange, this.props.timeFilters) || !_.isEqual(query, this.props.query);
          if (isUpdate) {
            this._onQueryChange({
              query,
              time: dateRange,
            });
          } else {
            this.props.setQuery({ forceRefresh: true });
          }
        }}
        onFiltersUpdated={this._onFiltersChange}
        dateRangeFrom={this.props.timeFilters.from}
        dateRangeTo={this.props.timeFilters.to}
        isRefreshPaused={this.state.isRefreshPaused}
        refreshInterval={this.state.refreshInterval}
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
      filter.$state = { store: FilterStateStore.APP_STATE };
    });
    this._onFiltersChange([...this.props.filters, ...newFilters]);
  };

  _renderLegacyUrlConflict() {
    const sharingSavedObjectProps = this.props.savedMap.getSharingSavedObjectProps();
    const spaces = getSpacesApi();
    return spaces && sharingSavedObjectProps?.outcome === 'conflict'
      ? spaces.ui.components.getLegacyUrlConflict({
          objectNoun: getMapEmbeddableDisplayName(),
          currentObjectId: this.props.savedMap.getSavedObjectId()!,
          otherObjectId: sharingSavedObjectProps.aliasTargetId!,
          otherObjectPath: `${getEditPath(sharingSavedObjectProps.aliasTargetId!)}${
            this.props.history.location.hash
          }`,
        })
      : null;
  }

  render() {
    if (!this.state.initialized) {
      return null;
    }

    return (
      <div id="maps-plugin" className={this.props.isFullScreen ? 'mapFullScreen' : ''}>
        {this._renderTopNav()}
        <h1 className="euiScreenReaderOnly">{`screenTitle placeholder`}</h1>
        <div id="react-maps-root">
          {this._renderLegacyUrlConflict()}
          <MapContainer
            addFilters={this._addFilter}
            title={this.props.savedMap.getAttributes().title}
            description={this.props.savedMap.getAttributes().description}
            waitUntilTimeLayersLoad$={waitUntilTimeLayersLoad$(this.props.savedMap.getStore())}
            isSharable
          />
        </div>
      </div>
    );
  }
}
