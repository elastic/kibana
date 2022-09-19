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

import type { TableIdLiteral } from '../../../../common/types/timeline';
import { addTableInStorage } from '../../containers/local_storage';

import {
  removeColumn,
  upsertColumn,
  applyDeltaToColumnWidth,
  setExcludedRowRendererIds,
  updateColumns,
  updateColumnOrder,
  updateColumnWidth,
  updateItemsPerPage,
  updateSort,
} from './actions';
import type { TimelineEpicDependencies } from '../timeline/types';

export const isNotNull = <T>(value: T | null): value is T => value !== null;

const tableActionTypes = [
  removeColumn.type,
  upsertColumn.type,
  applyDeltaToColumnWidth.type,
  updateColumns.type,
  updateColumnOrder.type,
  updateColumnWidth.type,
  updateItemsPerPage.type,
  updateSort.type,
  setExcludedRowRendererIds.type,
];

export const isPageTimeline = (tableId: string | undefined): boolean =>
  // Is not a flyout table
  !(tableId && tableId.toLowerCase().startsWith('timeline'));

export const createDataTableLocalStorageEpic =
  <State>(): Epic<Action, Action, State, TimelineEpicDependencies<State>> =>
  (action$, state$, { tableByIdSelector, storage }) => {
    const table$ = state$.pipe(map(tableByIdSelector), filter(isNotNull));
    return action$.pipe(
      delay(500),
      withLatestFrom(table$),
      filter(([action]) => isPageTimeline(get('payload.id', action))),
      tap(([action, tableById]) => {
        if (tableActionTypes.includes(action.type)) {
          if (storage) {
            const tableId: TableIdLiteral = get('payload.id', action);
            addTableInStorage(storage, tableId, tableById[tableId]);
          }
        }
      }),
      ignoreElements()
    );
  };
