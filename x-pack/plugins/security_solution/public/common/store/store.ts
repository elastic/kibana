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
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_INDEX_KEY,
  DETECTION_ENGINE_INDEX_URL,
  SERVER_APP_ID,
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
import type { KibanaDataView, SourcererModel } from './sourcerer/model';
import { initDataView } from './sourcerer/model';
import type { AppObservableLibs, StartedSubPlugins, StartPlugins } from '../../types';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { createSourcererDataView } from '../containers/sourcerer/create_sourcerer_data_view';

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
    const sourcererDataViews = await createSourcererDataView({
      body: {
        patternList: [...configPatternList, ...(signal.name != null ? [signal.name] : [])],
      },
      dataViewService: startPlugins.data.dataViews,
      dataViewId: `${DEFAULT_DATA_VIEW_ID}-${(await startPlugins.spaces?.getActiveSpace())?.id}`,
    });

    if (sourcererDataViews === undefined) {
      throw new Error('');
    }
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
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        ...subPlugins.alerts.storageDataTables!.tableById,
        ...subPlugins.rules.storageDataTables!.tableById,
        ...subPlugins.exceptions.storageDataTables!.tableById,
        ...subPlugins.explore.exploreDataTables!.hosts.tableById,
        ...subPlugins.explore.exploreDataTables!.network.tableById,
        ...subPlugins.explore.exploreDataTables!.users.tableById,
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
      },
    },
  };

  const timelineReducer = reduceReducers(
    timelineInitialState.timeline,
    startPlugins.timelines?.getTimelineReducer() ?? {},
    subPlugins.timelines.store.reducer.timeline
  ) as unknown as Reducer<TimelineState, AnyAction>;

  const initialState = createInitialState(
    {
      ...subPlugins.explore.store.initialState,
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
    ...subPlugins.explore.store.reducer,
    timeline: timelineReducer,
    ...subPlugins.management.store.reducer,
  };

  return createStore(initialState, rootReducer, libs$.pipe(pluck('kibana')), storage, [
    ...(subPlugins.management.store.middleware ?? []),
  ]);
};

/**
 * Factory for Security App's redux store.
 */
export const createStore = (
  state: State,
  pluginsReducer: SubPluginsInitReducer,
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
    createReducer(pluginsReducer),
    state as PreloadedState<State>,
    composeEnhancers(
      applyMiddleware(epicMiddleware, telemetryMiddleware, ...(additionalMiddleware ?? []))
    )
  );

  epicMiddleware.run(createRootEpic<CombinedState<State>>());

  return store;
};

export const getStore = (): Store<State, Action> | null => store;
