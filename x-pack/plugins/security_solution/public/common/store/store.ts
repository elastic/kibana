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
  AnyAction,
  Reducer,
} from 'redux';
import { applyMiddleware, createStore as createReduxStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import type { EnhancerOptions } from 'redux-devtools-extension';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import reduceReducers from 'reduce-reducers';
import { TimelineType } from '../../../common/api/timeline';
import { TimelineId } from '../../../common/types';
import { initialGroupingState } from './grouping/reducer';
import type { GroupState } from './grouping/types';
import {
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_INDEX_KEY,
  DETECTION_ENGINE_INDEX_URL,
  SERVER_APP_ID,
} from '../../../common/constants';
import { telemetryMiddleware } from '../lib/telemetry';
import * as timelineActions from '../../timelines/store/actions';
import type { TimelineModel } from '../../timelines/store/model';
import type { SubPluginsInitReducer } from './reducer';
import { createInitialState, createReducer } from './reducer';
import type { AppAction } from './actions';
import type { Immutable } from '../../../common/endpoint/types';
import type { State } from './types';
import type { TimelineState } from '../../timelines/store/types';
import type { KibanaDataView, SourcererModel, SourcererDataView } from './sourcerer/model';
import { initDataView } from './sourcerer/model';
import type { StartedSubPlugins, StartPlugins } from '../../types';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { createSourcererDataView } from '../containers/sourcerer/create_sourcerer_data_view';
import type { AnalyzerState } from '../../resolver/types';
import { resolverMiddlewareFactory } from '../../resolver/store/middleware';
import { dataAccessLayerFactory } from '../../resolver/data_access_layer/factory';
import { sourcererActions } from './sourcerer';
import { createMiddlewares } from './middlewares';
import { addNewTimeline } from '../../timelines/store/helpers';

let store: Store<State, Action> | null = null;

export const createStoreFactory = async (
  coreStart: CoreStart,
  startPlugins: StartPlugins,
  subPlugins: StartedSubPlugins,
  storage: Storage,
  enableExperimental: ExperimentalFeatures
): Promise<Store<State, Action>> => {
  let signal: { name: string | null; index_mapping_outdated: null | boolean } = {
    name: null,
    index_mapping_outdated: null,
  };
  try {
    if (coreStart.application.capabilities[SERVER_APP_ID].show === true) {
      signal = await coreStart.http.fetch(DETECTION_ENGINE_INDEX_URL, {
        version: '2023-10-31',
        method: 'GET',
      });
    }
  } catch {
    signal = { name: null, index_mapping_outdated: null };
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

  const timelineInitialState = {
    timeline: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ...subPlugins.timelines.store.initialState.timeline!,
      timelineById: {
        ...subPlugins.timelines.store.initialState.timeline.timelineById,
        ...addNewTimeline({
          id: TimelineId.active,
          timelineById: {},
          show: false,
          timelineType: TimelineType.default,
          columns: [],
          dataViewId: null,
          indexNames: [],
        }),
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

  const groupsInitialState: GroupState = {
    groups: initialGroupingState,
  };

  const analyzerInitialState: AnalyzerState = {
    analyzer: {},
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
      signalIndexMappingOutdated: signal.index_mapping_outdated,
      enableExperimental,
    },
    dataTableInitialState,
    groupsInitialState,
    analyzerInitialState
  );

  const rootReducer = {
    ...subPlugins.explore.store.reducer,
    timeline: timelineReducer,
    ...subPlugins.management.store.reducer,
  };

  return createStore(initialState, rootReducer, coreStart, storage, [
    ...(subPlugins.management.store.middleware ?? []),
    ...(subPlugins.explore.store.middleware ?? []),
    ...[resolverMiddlewareFactory(dataAccessLayerFactory(coreStart)) ?? []],
  ]);
};

const timelineActionsWithNonserializablePayloads = [
  timelineActions.updateTimeline.type,
  timelineActions.addTimeline.type,
  timelineActions.initializeTimelineSettings.type,
];

const actionSanitizer = (action: AnyAction) => {
  if (action.type === sourcererActions.setDataView.type) {
    return {
      ...action,
      payload: {
        ...action.payload,
        dataView: 'dataView',
        browserFields: 'browserFields',
        indexFields: 'indexFields',
        fields: 'fields',
      },
    };
  } else if (timelineActionsWithNonserializablePayloads.includes(action.type)) {
    const { type, payload } = action;
    if (type === timelineActions.addTimeline.type || type === timelineActions.updateTimeline.type) {
      return {
        ...action,
        payload: {
          ...payload,
          timeline: sanitizeTimelineModel(payload.timeline),
        },
      };
    } else if (type === timelineActions.initializeTimelineSettings.type) {
      return {
        ...action,
        payload: {
          ...payload,
          timeline: sanitizeTimelineModel(payload.timeline),
        },
      };
    }
  }
  return action;
};

const sanitizeDataView = (dataView: SourcererDataView) => {
  return {
    ...dataView,
    browserFields: 'browserFields',
    indexFields: 'indexFields',
    fields: 'fields',
    dataView: 'dataView',
  };
};

const sanitizeTimelineModel = (timeline: TimelineModel) => {
  return {
    ...timeline,
    footerText: 'footerText',
    loadingText: 'loadingText',
  };
};

const stateSanitizer = (state: State) => {
  if (state.sourcerer) {
    return {
      ...state,
      sourcerer: {
        ...state.sourcerer,
        defaultDataView: sanitizeDataView(state.sourcerer.defaultDataView),
        kibanaDataViews: state.sourcerer.kibanaDataViews.map(sanitizeDataView),
      },
    };
  } else {
    return state;
  }
};

/**
 * Factory for Security App's redux store.
 */
export const createStore = (
  state: State,
  pluginsReducer: SubPluginsInitReducer,
  kibana: CoreStart,
  storage: Storage,
  additionalMiddleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>
): Store<State, Action> => {
  const enhancerOptions: EnhancerOptions = {
    name: 'Kibana Security Solution',
    actionsBlacklist: ['USER_MOVED_POINTER', 'USER_SET_RASTER_SIZE'],
    actionSanitizer: actionSanitizer as EnhancerOptions['actionSanitizer'],
    stateSanitizer: stateSanitizer as EnhancerOptions['stateSanitizer'],
    // uncomment the following to enable redux action tracing
    // https://github.com/zalmoxisus/redux-devtools-extension/commit/64717bb9b3534ff616d9db56c2be680627c7b09d#diff-182cb140f8a0fd8bc37bbdcdad07bbadb9aebeb2d1b8ed026acd6132f2c88ce8R10
    // trace: true,
    // traceLimit: 100,
  };

  const composeEnhancers = composeWithDevTools(enhancerOptions);

  const middlewareEnhancer = applyMiddleware(
    ...createMiddlewares(kibana, storage),
    telemetryMiddleware,
    ...(additionalMiddleware ?? [])
  );

  store = createReduxStore(
    createReducer(pluginsReducer),
    state as PreloadedState<State>,
    composeEnhancers(middlewareEnhancer)
  );

  return store;
};

export const getStore = (): Store<State, Action> | null => store;
