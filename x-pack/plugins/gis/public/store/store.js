/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { combineReducers, createStore } from 'redux';
import ui from './ui';
import map from './map';
import config from './config';

const reducers = {
  map,
  ui,
  config
};
const rootReducer = combineReducers(reducers);

let initConfig = null;
uiModules
  .get('kibana')
  .run((Private, $injector) => {
    const serviceSettings = $injector.get('serviceSettings');
    const mapConfig = $injector.get('mapConfig');
    initConfig = {
      config: {
        serviceSettings: serviceSettings,
        mapConfig: mapConfig
      }
    };
  });

export const getStore = async function () {
  return new Promise(resolve => {
    const handle = setInterval(() => {
      if (initConfig !== null) {
        clearInterval(handle);
        const store = createStore(rootReducer, { ...reducers, ...initConfig });
        resolve(store);
      }
    }, 10);
  });
};
