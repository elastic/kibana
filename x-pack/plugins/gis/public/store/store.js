/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, applyMiddleware, createStore, compose } from 'redux';
import thunk from 'redux-thunk';
import ui from './ui';
import { map } from './map';
import { loadMetaResources } from "../actions/store_actions";
import config from './config';

// TODO this should not be exported and all access to the store be via getStore
export let store;

const rootReducer = combineReducers({
  map,
  ui,
  config
});

const enhancers = [ applyMiddleware(thunk) ];
window.__REDUX_DEVTOOLS_EXTENSION
  && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());

export const getStore = async function () {
  if (store) {
    return store;
  }

  const storeConfig = {};
  store = createStore(
    rootReducer,
    storeConfig,
    compose(...enhancers)
  );
  await loadMetaResources(store.dispatch);
  return store;
};
