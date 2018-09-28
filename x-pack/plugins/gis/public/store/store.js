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
import { loadMapResources } from "../actions/store_actions";
import _ from 'lodash';
import config from './config';

const getMapInitState = attributes => {
  if (attributes && !_.isEmpty(attributes)) {
    return { map: { mapState: attributes } };
  }
};

const rootReducer = combineReducers({
  map,
  ui,
  config
});

const enhancers = [ applyMiddleware(thunk) ];
window.__REDUX_DEVTOOLS_EXTENSION
  && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());

export let gisStateSync;
const updateAppState = id => {
  if (!gisStateSync) {
    throw new Error('GIS State not defined');
  }
  if (id && id !== workspaceId) {
    gisStateSync.set('workSpaceId', id);
  }
}

let initConfig = null;
uiModules
  .get('kibana')
  .run(AppState => gisStateSync = new AppState().makeStateful('gis'))
  .run(gisWorkspace => {
    // Load saved workspace if present
    const workspaceId = gisStateSync.get('workspaceId');
    (async () => {
      const workspace = await gisWorkspace.get(workspaceId) ||
        await gisWorkspace.find();
      if (workspace) {
        updateAppState(id);
        initConfig = getMapInitState(attributes);
      } else {
        initConfig = {};
      }
    })();
  });

let storePromise;
export const getStore = async function () {
  if (storePromise) return storePromise;
  storePromise = new Promise(resolve => {
    const handle = setInterval(() => {
      if (initConfig !== null) {
        clearInterval(handle);
        const store = createStore(
          rootReducer,
          initConfig,
          compose(...enhancers)
        );
        resolve(store);
        loadMapResources(store.dispatch);
      }
    }, 10);
  });
  return storePromise;
};
