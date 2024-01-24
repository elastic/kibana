/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Middleware } from 'redux';
import { get } from 'lodash/fp';
import { debounce } from 'lodash';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

import { usersActions } from '.';
import { selectUserAssetTables } from './selectors';
import type { UserAssetQuery, UserAssetTableType } from './model';
import type { State } from '../../../common/store/types';
import { persistUserAssetTableInStorage } from './storage';

const { removeUserAssetTableField, addUserAssetTableField } = usersActions;
const tableActionTypes = new Set([removeUserAssetTableField.type, addUserAssetTableField.type]);

const debouncedpersistUserAssetTableInStorage = debounce(
  (storage: Storage, id: UserAssetTableType, table: UserAssetQuery) =>
    persistUserAssetTableInStorage(storage, id, table),
  500
);

export const userAssetTableLocalStorageMiddleware: (storage: Storage) => Middleware<{}, State> =
  (storage: Storage) => (store) => (next) => (action: Action) => {
    // perform the action
    next(action);

    // persist the table state when a table action has been performed
    if (tableActionTypes.has(action.type)) {
      const tableById = selectUserAssetTables(store.getState());
      if (tableById && storage) {
        if (tableActionTypes.has(action.type)) {
          const tableId: UserAssetTableType = get('payload.tableId', action);
          debouncedpersistUserAssetTableInStorage(storage, tableId, tableById[tableId]);
        }
      }
    }
  };
