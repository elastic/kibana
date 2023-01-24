/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

export interface LocalStorageLens {
  indexPatternId?: string;
  skipDeleteModal?: boolean;
}

export const LOCAL_STORAGE_LENS_KEY = 'lens-settings';

export const readFromStorage = (storage: IStorageWrapper, key: string) => {
  const data = storage.get(LOCAL_STORAGE_LENS_KEY);
  return data && data[key];
};
export const writeToStorage = (storage: IStorageWrapper, key: string, value: string) => {
  storage.set(LOCAL_STORAGE_LENS_KEY, { ...storage.get(LOCAL_STORAGE_LENS_KEY), [key]: value });
};
