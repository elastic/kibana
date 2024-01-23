/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux';
import { map, filter, ignoreElements, tap, withLatestFrom, delay } from 'rxjs/operators';
import type { Epic } from 'redux-observable';
import { get } from 'lodash/fp';
import type { RootEpicDependencies } from '../../../common/store/epic';
import { usersActions } from '.';
import { selectUserAssetTables } from './selectors';
import type { UserAssetTableType } from './model';
import type { State } from '../../../common/store/types';
export const isNotNull = <T>(value: T | null): value is T => value !== null;
import { persistUserAssetTableInStorage } from './storage';

const { removeUserAssetTableField, addUserAssetTableField } = usersActions;
const tableActionTypes = new Set([removeUserAssetTableField.type, addUserAssetTableField.type]);

export const createUserAssetTableLocalStorageEpic =
  <StateT extends State>(): Epic<Action, Action, StateT, RootEpicDependencies> =>
  (action$, state$, { storage }) => {
    const table$ = state$.pipe(map(selectUserAssetTables), filter(isNotNull));
    return action$.pipe(
      delay(500),
      withLatestFrom(table$),
      tap(([action, tableById]) => {
        if (tableActionTypes.has(action.type)) {
          const tableId: UserAssetTableType = get('payload.tableId', action);
          persistUserAssetTableInStorage(storage, tableId, tableById[tableId]);
        }
      }),
      ignoreElements()
    );
  };
