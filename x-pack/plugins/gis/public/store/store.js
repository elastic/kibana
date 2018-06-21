/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { combineReducers, applyMiddleware, createStore, compose }
  from 'redux';
import thunk from 'redux-thunk';
import ui from './ui';
import { map } from './map';
import { loadMapResources } from "../actions/map_actions";
import config from './config';

const rootReducer = combineReducers({
  map,
  ui,
  config
});

const enhancers = [ applyMiddleware(thunk) ];
window.__REDUX_DEVTOOLS_EXTENSION
  && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());

let initConfig = null;
let serviceSettings = null;
uiModules
  .get('kibana')
  .run((Private, $injector) => {
    serviceSettings = $injector.get('serviceSettings');
    const mapConfig = $injector.get('mapConfig');
    initConfig = {
      config: {
        mapConfig
      }
    };
  });

export const getStore = async function () {
  return new Promise(resolve => {
    const handle = setInterval(() => {
      if (initConfig !== null) {
        clearInterval(handle);
        const store = createStore(
          rootReducer,
          { ...initConfig },
          compose(...enhancers)
        );
        resolve(store);
        loadMapResources(serviceSettings, store.dispatch);
      }
    }, 10);
  });
};

