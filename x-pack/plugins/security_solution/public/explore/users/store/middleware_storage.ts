/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Middleware } from 'redux';
import { get } from 'lodash/fp';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

import { usersActions } from '.';
import { selectUserAssetTables } from './selectors';
import type { UserAssetTableType } from './model';
import type { State } from '../../../common/store/types';
import { persistUserAssetTableInStorage } from './storage';

const { removeUserAssetTableField, addUserAssetTableField } = usersActions;
const tableActionTypes = new Set([removeUserAssetTableField.type, addUserAssetTableField.type]);

export const userAssetTableLocalStorageMiddleware: (storage: Storage) => Middleware<{}, State> =
  (storage: Storage) => (store) => (next) => (action: Action) => {
    // perform the action
    const ret = next(action);

    // persist the table state when a table action has been performed
    if (tableActionTypes.has(action.type)) {
      const tableById = selectUserAssetTables(store.getState());
      const tableId: UserAssetTableType = get('payload.tableId', action);
      if (tableById && tableById[tableId] && storage) {
        if (tableActionTypes.has(action.type)) {
          persistUserAssetTableInStorage(storage, tableId, tableById[tableId]);
        }
      }
    }

    return ret;
  };
