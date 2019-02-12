/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, applyMiddleware, createStore, compose } from 'redux';
import thunk from 'redux-thunk';
import { ui } from './ui';
import { map } from './map';

const rootReducer = combineReducers({
  map,
  ui
});

const enhancers = [ applyMiddleware(thunk) ];
window.__REDUX_DEVTOOLS_EXTENSION
  && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());

export function createMapStore() {
  const storeConfig = {};
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  return createStore(
    rootReducer,
    storeConfig,
    composeEnhancers(...enhancers)
  );
}
