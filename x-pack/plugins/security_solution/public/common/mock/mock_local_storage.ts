/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IStorage } from '@kbn/kibana-utils-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

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

const createStorageMock = (storeMock: IStorage): Storage => {
  const storage = new Storage(storeMock);
  return {
    store: storeMock,
    get: jest.fn((...args) => storage.get(...args)),
    clear: jest.fn((...args) => storage.clear(...args)),
    set: jest.fn((...args) => storage.set(...args)),
    remove: jest.fn((...args) => storage.remove(...args)),
  } as Storage;
};

export const createSecuritySolutionStorageMock = () => {
  const localStorage = localStorageMock();
  return {
    localStorage,
    storage: createStorageMock(localStorage),
  };
};
