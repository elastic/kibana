/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyMiddleware, compose, createStore } from 'redux';

import { apiMiddleware } from './api_middleware';
import { ccr } from './reducers';

function createCrossClusterReplicationStore(initialState = {}) {
  const enhancers = [applyMiddleware(apiMiddleware)];

  if (window.__REDUX_DEVTOOLS_EXTENSION__) {
    enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());
  }
  return createStore(ccr, initialState, compose(...enhancers));
}

export const ccrStore = createCrossClusterReplicationStore();
