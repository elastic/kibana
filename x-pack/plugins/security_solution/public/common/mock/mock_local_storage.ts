/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IStorage, Storage } from '../../../../../../src/plugins/kibana_utils/public';

export const localStorageMock = (): IStorage => {
  let store: Record<string, unknown> = {};

  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: unknown) => {
      store[key] = value;
    },
    clear() {
      store = {};
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
};

export const createSecuritySolutionStorageMock = () => {
  const localStorage = localStorageMock();
  return {
    localStorage,
    storage: new Storage(localStorage),
  };
};
