/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Action,
  Store,
  Middleware,
  Dispatch,
  PreloadedState,
  CombinedState,
  AnyAction,
  Reducer,
} from 'redux';
import { applyMiddleware, compose, createStore as createReduxStore } from 'redux';

import { createEpicMiddleware } from 'redux-observable';
import type { Observable } from 'rxjs';
import { BehaviorSubject, pluck } from 'rxjs';

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import reduceReducers from 'reduce-reducers';
import {
  DEFAULT_INDEX_KEY,
  DETECTION_ENGINE_INDEX_URL,
  SERVER_APP_ID,
  SOURCERER_API_URL,
} from '../../../common/constants';
import { telemetryMiddleware } from '../lib/telemetry';
import { appSelectors } from './app';
import { timelineSelectors } from '../../timelines/store/timeline';
import { inputsSelectors } from './inputs';
import type { SubPluginsInitReducer } from './reducer';
import { createInitialState, createReducer } from './reducer';
import { createRootEpic } from './epic';
import type { AppAction } from './actions';
import type { Immutable } from '../../../common/endpoint/types';
import type { State } from './types';
import type { TimelineEpicDependencies, TimelineState } from '../../timelines/store/timeline/types';
import { dataTableSelectors } from './data_table';
import type { DataTableReducer } from './data_table';
import type { KibanaDataView, SourcererModel } from './sourcerer/model';
import { initDataView } from './sourcerer/model';
import type { AppObservableLibs, StartedSubPlugins, StartPlugins } from '../../types';
import type { SecurityDataView } from '../containers/sourcerer/api';
import type { ExperimentalFeatures } from '../../../common/experimental_features';

type ComposeType = typeof compose;
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: ComposeType;
  }
}
let store: Store<State, Action> | null = null;

export const createStoreFactory = async (
  coreStart: CoreStart,
  startPlugins: StartPlugins,
  subPlugins: StartedSubPlugins,
  storage: Storage,
  enableExperimental: ExperimentalFeatures
): Promise<Store<State, Action>> => {
  let signal: { name: string | null } = { name: null };
  try {
    if (coreStart.application.capabilities[SERVER_APP_ID].show === true) {
      signal = await coreStart.http.fetch(DETECTION_ENGINE_INDEX_URL, {
        method: 'GET',
      });
    }
  } catch {
    signal = { name: null };
  }

  const configPatternList = coreStart.uiSettings.get(DEFAULT_INDEX_KEY);
  let defaultDataView: SourcererModel['defaultDataView'];
  let kibanaDataViews: SourcererModel['kibanaDataViews'];
  try {
    // check for/generate default Security Solution Kibana data view
    const sourcererDataViews: SecurityDataView = await coreStart.http.fetch(SOURCERER_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        patternList: [...configPatternList, ...(signal.name != null ? [signal.name] : [])],
      }),
    });
    defaultDataView = { ...initDataView, ...sourcererDataViews.defaultDataView };
    kibanaDataViews = sourcererDataViews.kibanaDataViews.map((dataView: KibanaDataView) => ({
      ...initDataView,
      ...dataView,
    }));
  } catch (error) {
    defaultDataView = { ...initDataView, error };
    kibanaDataViews = [];
  }
  const appLibs: AppObservableLibs = { kibana: coreStart };
  const libs$ = new BehaviorSubject(appLibs);

  const timelineInitialState = {
    timeline: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ...subPlugins.timelines.store.initialState.timeline!,
      timelineById: {
        ...subPlugins.timelines.store.initialState.timeline.timelineById,
      },
    },
  };

  const dataTableInitialState = {
    dataTable: {
      tableById: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...subPlugins.alerts.storageDataTables!.tableById,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...subPlugins.rules.storageDataTables!.tableById,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...subPlugins.exceptions.storageDataTables!.tableById,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...subPlugins.hosts.storageDataTables!.tableById,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...subPlugins.network.storageDataTables!.tableById,
      },
    },
  };

  const tGridReducer = startPlugins.timelines?.getTGridReducer() ?? {};
  const timelineReducer = reduceReducers(
    timelineInitialState.timeline,
    startPlugins.timelines?.getTimelineReducer() ?? {},
    subPlugins.timelines.store.reducer.timeline
  ) as unknown as Reducer<TimelineState, AnyAction>;

  const initialState = createInitialState(
    {
      ...subPlugins.hosts.store.initialState,
      ...subPlugins.users.store.initialState,
      ...subPlugins.network.store.initialState,
      ...timelineInitialState,
      ...subPlugins.management.store.initialState,
    },
    {
      defaultDataView,
      kibanaDataViews,
      signalIndexName: signal.name,
      enableExperimental,
    },
    dataTableInitialState
  );

  const rootReducer = {
    ...subPlugins.hosts.store.reducer,
    ...subPlugins.users.store.reducer,
    ...subPlugins.network.store.reducer,
    timeline: timelineReducer,
    ...subPlugins.management.store.reducer,
    ...tGridReducer,
  };

  return createStore(
    initialState,
    rootReducer,
    { dataTable: tGridReducer },
    libs$.pipe(pluck('kibana')),
    storage,
    [...(subPlugins.management.store.middleware ?? [])]
  );
};

/**
 * Factory for Security App's redux store.
 */
export const createStore = (
  state: State,
  pluginsReducer: SubPluginsInitReducer,
  tgridReducer: DataTableReducer, // TODO: remove this param, when the table reducer will be moved to security_solution
  kibana: Observable<CoreStart>,
  storage: Storage,
  additionalMiddleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>
): Store<State, Action> => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const middlewareDependencies: TimelineEpicDependencies<State> = {
    kibana$: kibana,
    selectAllTimelineQuery: inputsSelectors.globalQueryByIdSelector,
    selectNotesByIdSelector: appSelectors.selectNotesByIdSelector,
    timelineByIdSelector: timelineSelectors.timelineByIdSelector,
    timelineTimeRangeSelector: inputsSelectors.timelineTimeRangeSelector,
    tableByIdSelector: dataTableSelectors.tableByIdSelector,
    storage,
  };

  const epicMiddleware = createEpicMiddleware<Action, Action, State, typeof middlewareDependencies>(
    {
      dependencies: middlewareDependencies,
    }
  );

  store = createReduxStore(
    createReducer(pluginsReducer, tgridReducer),
    state as PreloadedState<State>,
    composeEnhancers(
      applyMiddleware(epicMiddleware, telemetryMiddleware, ...(additionalMiddleware ?? []))
    )
  );

  epicMiddleware.run(createRootEpic<CombinedState<State>>());

  return store;
};

export const getStore = (): Store<State, Action> | null => store;
