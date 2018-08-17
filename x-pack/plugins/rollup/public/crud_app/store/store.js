/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

import { rollupJobs } from './reducers/';

export const rollupJobsStore = (initialState = {}) => {
  const enhancers = [ applyMiddleware(thunk) ];

  window.__REDUX_DEVTOOLS_EXTENSION__ && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());
  return createStore(
    rollupJobs,
    initialState,
    compose(...enhancers)
  );
};
