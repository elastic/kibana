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
  } else {
    return {};
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
let initConfig = null;
uiModules
  .get('kibana')
  .run((AppState, gisWorkspace) => {
    gisStateSync = new AppState().makeStateful('gis');
    // Load saved workspace if present
    const workspaceId = gisStateSync.get('workspaceId');
    gisWorkspace.get(workspaceId).then(({ id, attributes }) => {
      if (id && id !== workspaceId) {
        gisStateSync.set('workSpaceId', id);
      }
      initConfig = getMapInitState(attributes);
    });
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
