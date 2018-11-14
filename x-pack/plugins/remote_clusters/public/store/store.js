/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

import { remoteClusters } from './reducers';

function createRemoteClustersStore(initialState = {}) {
  const enhancers = [ applyMiddleware(thunk) ];
  return createStore(
    remoteClusters,
    initialState,
    compose(...enhancers)
  );
}

export const remoteClustersStore = createRemoteClustersStore();
