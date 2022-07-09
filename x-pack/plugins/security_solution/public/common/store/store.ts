/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Store, Middleware, Dispatch, PreloadedState, CombinedState } from 'redux';
import { applyMiddleware, compose, createStore as createReduxStore } from 'redux';

import { createEpicMiddleware } from 'redux-observable';
import type { Observable } from 'rxjs';

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { telemetryMiddleware } from '../lib/telemetry';
import { appSelectors } from './app';
import { timelineSelectors } from '../../timelines/store/timeline';
import { inputsSelectors } from './inputs';
import type { SubPluginsInitReducer } from './reducer';
import { createReducer } from './reducer';
import { createRootEpic } from './epic';
import type { AppAction } from './actions';
import type { Immutable } from '../../../common/endpoint/types';
import type { State } from './types';
import type { TimelineEpicDependencies } from '../../timelines/store/timeline/types';

type ComposeType = typeof compose;
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: ComposeType;
  }
}
/**
 * The Redux store type for the Security app.
 */
export type SecurityAppStore = Store<State, Action>;
let store: Store<State, Action> | null = null;

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
