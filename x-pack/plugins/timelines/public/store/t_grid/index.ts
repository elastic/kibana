/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Action,
  applyMiddleware,
  CombinedState,
  compose,
  createStore as createReduxStore,
  PreloadedState,
  Store,
} from 'redux';

import { createEpicMiddleware } from 'redux-observable';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { TimelineState, TGridEpicDependencies } from '../../types';
import { tGridReducer } from './reducer';
import { getTGridByIdSelector } from './selectors';

export * from './model';
export * as tGridActions from './actions';
export * as tGridSelectors from './selectors';
export * from './types';
export { tGridReducer };

export type State = CombinedState<TimelineState>;
type ComposeType = typeof compose;
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: ComposeType;
  }
}

/**
 * Factory for Security App's redux store.
 */
export const createStore = (
  state: PreloadedState<TimelineState>,
  storage: Storage
): Store<State, Action> => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const middlewareDependencies: TGridEpicDependencies<State> = {
    tGridByIdSelector: getTGridByIdSelector,
    storage,
  };

  const epicMiddleware = createEpicMiddleware<Action, Action, State, typeof middlewareDependencies>(
    {
      dependencies: middlewareDependencies,
    }
  );

  const store: Store<State, Action> = createReduxStore(
    tGridReducer,
    state,
    composeEnhancers(applyMiddleware(epicMiddleware))
  );

  return store;
};
