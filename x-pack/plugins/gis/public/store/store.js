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
import { loadMapResources, replaceLayerList, loadMetaResources } from "../actions/store_actions";
import _ from 'lodash';
import config from './config';
import { storeFromSavedObjectAttributes } from '../shared/services/save_map_state';

export let store;

const rootReducer = combineReducers({
  map,
  ui,
  config
});

const enhancers = [ applyMiddleware(thunk) ];
window.__REDUX_DEVTOOLS_EXTENSION
  && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());

export let gisStateSync;
const updateAppState = (fetchedId, workspaceId) => {
  if (!gisStateSync) {
    throw new Error('GIS State not defined');
  }
  if (fetchedId && fetchedId !== workspaceId) {
    gisStateSync.set('workspaceId', fetchedId);
  }
};

let initConfig = null;
uiModules
  .get('kibana')
  .run((gisWorkspace, AppState) => {
    // Load saved workspace if present
    gisStateSync = new AppState().makeStateful('gis');
    const workspaceId = gisStateSync.get('workspaceId');
    (async () => {
      const workspace = await gisWorkspace.get(workspaceId) ||
        await gisWorkspace.find();
      if (workspace && !_.isEmpty(workspace.attributes)) {
        const workspaceId = gisStateSync.get('workspaceId');
        const { id, attributes } = workspace;
        updateAppState(id, workspaceId);
        initConfig = storeFromSavedObjectAttributes(attributes);
      } else {
        gisStateSync.reset('workspaceId');
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
        const storeConfig = (_.isEmpty(initConfig)) ? initConfig : { map: { ...initConfig, layerList: [], ready: false } };
        const createdStore = createStore(
          rootReducer,
          storeConfig,
          compose(...enhancers)
        );
        store = createdStore;
        resolve(createdStore);
        loadMetaResources(store.dispatch).then(()=> {
          if (initConfig.layerList && initConfig.layerList.length) {
            store.dispatch(replaceLayerList(initConfig.layerList));
          } else { // Load init/sample data
            loadMapResources(store.dispatch);
          }
        });
      }
    }, 10);
  });
  return storePromise;
};
