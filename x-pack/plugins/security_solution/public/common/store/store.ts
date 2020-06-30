/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Action,
  applyMiddleware,
  compose,
  createStore as createReduxStore,
  Store,
  Middleware,
  Dispatch,
  PreloadedState,
} from 'redux';

import { createEpicMiddleware } from 'redux-observable';
import { Observable } from 'rxjs';

import { telemetryMiddleware } from '../lib/telemetry';
import { appSelectors } from './app';
import { timelineSelectors } from '../../timelines/store/timeline';
import { inputsSelectors } from './inputs';
import { SubPluginsInitReducer, createReducer } from './reducer';
import { createRootEpic } from './epic';
import { AppApolloClient } from '../lib/lib';
import { AppAction } from './actions';
import { Immutable } from '../../../common/endpoint/types';
import { State } from './types';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { CoreStart } from '../../../../../../src/core/public';

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
  state: PreloadedState<State>,
  pluginsReducer: SubPluginsInitReducer,
  apolloClient: Observable<AppApolloClient>,
  kibana: Observable<CoreStart>,
  storage: Storage,
  additionalMiddleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>
): Store<State, Action> => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const middlewareDependencies = {
    apolloClient$: apolloClient,
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
    state,
    composeEnhancers(
      applyMiddleware(epicMiddleware, telemetryMiddleware, ...(additionalMiddleware ?? []))
    )
  );

  epicMiddleware.run(createRootEpic<State>());

  return store;
};

export const getStore = (): Store<State, Action> | null => store;
