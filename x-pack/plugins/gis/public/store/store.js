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

const rootReducer = combineReducers({
  map,
  ui,
  config
});

const enhancers = [ applyMiddleware(thunk) ];
window.__REDUX_DEVTOOLS_EXTENSION
  && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());

const getMapInitState = ({ mapState }) => {
  if (mapState && !_.isEmpty(mapState)) {
    mapState = JSON.parse(mapState, (key, val) => isNaN(val) ? val : +val);
    return { map: { mapState: mapState.mapState } };
  }
};

export let gisStateSync;
const updateAppState = (fetchedId, workspaceId) => {
  if (!gisStateSync) {
    throw new Error('GIS State not defined');
  }
  if (fetchedId && fetchedId !== workspaceId) {
    gisStateSync.set('workspaceId', fetchedId);
  }
}

let initConfig = null;
uiModules
  .get('kibana')
  .run((gisWorkspace, AppState, getAppState) => {
    // Load saved workspace if present
    gisStateSync = new AppState().makeStateful('gis')
    const workspaceId = gisStateSync.get('workspaceId');
    (async () => {
      const workspace = await gisWorkspace.get(workspaceId) ||
        await gisWorkspace.find();
      if (workspace && !_.isEmpty(workspace.attributes)) {
        const workspaceId = gisStateSync.get('workspaceId');
        const { id, attributes } = workspace;
        updateAppState(id, workspaceId);
        initConfig = getMapInitState(attributes);
      } else {
        gisStateSync.reset('workspaceId');
        location.assign(location.href.split('&')[0]) // Reset location
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
