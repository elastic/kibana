/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, applyMiddleware, compose, createStore as createReduxStore, Store } from 'redux';

import { createEpicMiddleware } from 'redux-observable';
import { Observable } from 'rxjs';

import { telemetryMiddleware } from '../lib/telemetry';
import { appSelectors } from './app';
import { timelineSelectors } from '../../timelines/store/timeline';
import { inputsSelectors } from './inputs';
import { State, SubPluginsInitReducer, createReducer } from './reducer';
import { createRootEpic } from './epic';
import { AppApolloClient } from '../lib/lib';

type ComposeType = typeof compose;
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: ComposeType;
  }
}
let store: Store<State, Action> | null = null;
export { SubPluginsInitReducer };
export const createStore = (
  state: State,
  pluginsReducer: SubPluginsInitReducer,
  apolloClient: Observable<AppApolloClient>
): Store<State, Action> => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const middlewareDependencies = {
    apolloClient$: apolloClient,
    selectAllTimelineQuery: inputsSelectors.globalQueryByIdSelector,
    selectNotesByIdSelector: appSelectors.selectNotesByIdSelector,
    timelineByIdSelector: timelineSelectors.timelineByIdSelector,
    timelineTimeRangeSelector: inputsSelectors.timelineTimeRangeSelector,
  };

  const epicMiddleware = createEpicMiddleware<Action, Action, State, typeof middlewareDependencies>(
    {
      dependencies: middlewareDependencies,
    }
  );

  store = createReduxStore(
    createReducer(pluginsReducer),
    state,
    composeEnhancers(applyMiddleware(epicMiddleware, telemetryMiddleware))
  );

  epicMiddleware.run(createRootEpic<State>());

  return store;
};

export const getStore = (): Store<State, Action> | null => store;
