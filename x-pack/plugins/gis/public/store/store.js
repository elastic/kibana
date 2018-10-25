/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, applyMiddleware, createStore, compose } from 'redux';
import thunk from 'redux-thunk';
import ui from './ui';
import { map } from './map';
import { loadMapResources, loadMetaResources } from "../actions/store_actions";
import config from './config';

export let store;

const rootReducer = combineReducers({
  map,
  ui,
  config
});

const enhancers = [ applyMiddleware(thunk) ];
window.__REDUX_DEVTOOLS_EXTENSION
  && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());

let storePromise;
export const getStore = async function () {
  if (storePromise) return storePromise;
  storePromise = new Promise(resolve => {
    const handle = setInterval(() => {
      clearInterval(handle);
      const storeConfig = {};
      const createdStore = createStore(
        rootReducer,
        storeConfig,
        compose(...enhancers)
      );
      store = createdStore;
      resolve(createdStore);
      loadMetaResources(store.dispatch).then(()=> {
        //store.dispatch(replaceLayerList(initConfig.layerList));
        loadMapResources(store.dispatch);
      });
    }, 10);
  });
  return storePromise;
};
