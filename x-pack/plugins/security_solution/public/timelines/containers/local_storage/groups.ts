/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { GroupModel } from '../../../common/store/grouping';
const LOCAL_STORAGE_GROUPING_KEY = 'groups';

const EMPTY_GROUP = {} as {
  [K: string]: GroupModel;
};

export const getAllGroupsInStorage = (storage: Storage) => {
  const allGroups = storage.get(LOCAL_STORAGE_GROUPING_KEY);
  if (!allGroups) {
    return EMPTY_GROUP;
  }
  return allGroups;
};

export const addGroupsToStorage = (storage: Storage, groupingId: string, group: GroupModel) => {
  const groups = getAllGroupsInStorage(storage);
  storage.set(LOCAL_STORAGE_GROUPING_KEY, {
    ...groups,
    [groupingId]: group,
  });
};
