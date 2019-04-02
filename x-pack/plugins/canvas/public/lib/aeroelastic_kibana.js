/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createLayoutStore, matrix } from './aeroelastic';

const stores = new Map();

export const aeroelastic = {
  matrix,

  clearStores() {
    stores.clear();
  },

  createStore(initialState, onChangeCallback = () => {}, page) {
    stores.set(page, createLayoutStore(initialState, onChangeCallback));
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
