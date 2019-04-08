/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { layout, matrix, state } from './aeroelastic';

const stores = new Map();

export const aeroelastic = {
  matrix,

  clearStores() {
    stores.clear();
  },

  createStore(initialState, onChangeCallback = () => {}, page) {
    stores.set(page, state.createStore(initialState, onChangeCallback));

    const updateScene = state.select((nextScene, primaryUpdate) => ({
      shapeAdditions: nextScene.shapes,
      primaryUpdate,
      currentScene: nextScene,
      configuration: nextScene.configuration,
    }))(layout.nextScene, layout.primaryUpdate);

    stores.get(page).setUpdater(updateScene);
  },

  removeStore(page) {
    if (stores.has(page)) {
      stores.delete(page);
    }
  },

  getStore(page) {
    const store = stores.get(page);
    if (!store) {
      throw new Error('An aeroelastic store should exist for page ' + page);
    }

    return store.getCurrentState();
  },

  commit(page, ...args) {
    const store = stores.get(page);
    return store && store.commit(...args);
  },
};
