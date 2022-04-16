/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

const STORAGE_KEY = 'lens-settings';

export const readFromStorage = (storage: IStorageWrapper, key: string) => {
  const data = storage.get(STORAGE_KEY);
  return data && data[key];
};
export const writeToStorage = (storage: IStorageWrapper, key: string, value: string) => {
  storage.set(STORAGE_KEY, { ...storage.get(STORAGE_KEY), [key]: value });
};
