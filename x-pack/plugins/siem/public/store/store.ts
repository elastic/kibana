/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, applyMiddleware, compose, createStore as createReduxStore, Store } from 'redux';
import { initialState, State, reducer } from './reducer';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
  }
}

export const createStore = (state = initialState): Store<State, AnyAction> => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const store = createReduxStore(reducer, state, composeEnhancers(applyMiddleware()));

  return store;
};
