/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import * as middleware from './middleware';

import { rootReducer } from './reducers/';

let store;

export const buildStore = (initialState = {}) => {
  const enhancers = [ applyMiddleware(...Object.values(middleware), thunk) ];

  window.__REDUX_DEVTOOLS_EXTENSION__ && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());
  store = createStore(
    rootReducer,
    initialState,
    compose(...enhancers)
  );

  return store;
};

export const getStore = () => store;
