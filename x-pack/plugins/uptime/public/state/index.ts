/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { rootEffect } from './effects';
import { rootReducer } from './reducers';

export type AppState = ReturnType<typeof rootReducer>;

export const initializeStore = () => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const sagaMW = createSagaMiddleware();

  const store = createStore(rootReducer, composeEnhancers(applyMiddleware(sagaMW)));

  sagaMW.run(rootEffect);

  return store;
};
