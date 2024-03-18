/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UserAssetQuery, UserAssetTableType } from './model';
export const LOCAL_STORAGE_KEY = 'securityUserFlyoutAssetTable';

export const getUserAssetTableFromStorage = (storage: Storage) => storage.get(LOCAL_STORAGE_KEY);

export const persistUserAssetTableInStorage = (
  storage: Storage,
  id: UserAssetTableType,
  table: UserAssetQuery
) => {
  const tables = storage.get(LOCAL_STORAGE_KEY);
  storage.set(LOCAL_STORAGE_KEY, {
    ...tables,
    [id]: table,
  });
};
