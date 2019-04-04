/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Action,
  AnyAction,
  applyMiddleware,
  compose,
  createStore as createReduxStore,
  Store,
} from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { createRootEpic, initialState, inputsSelectors, reducer, State } from '.';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
  }
}

export const createStore = (state = initialState): Store<State, AnyAction> => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const middlewareDependencies = {
    selectGlobalPolicy: inputsSelectors.globalPolicySelector,
    selectGlobalTimeRange: inputsSelectors.globalTimeRangeSelector,
  };

  const epicMiddleware = createEpicMiddleware<Action, Action, State, typeof middlewareDependencies>(
    {
      dependencies: middlewareDependencies,
    }
  );

  const store = createReduxStore(reducer, state, composeEnhancers(applyMiddleware(epicMiddleware)));

  epicMiddleware.run(createRootEpic<State>());

  return store;
};
