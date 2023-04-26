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

import { dataTableActions } from '@kbn/securitysolution-data-table';
import type { TableIdLiteral } from '@kbn/securitysolution-data-table';
import { updateTotalCount } from '../../../timelines/store/timeline/actions';
import { addTableInStorage } from '../../../timelines/containers/local_storage';

import type { TimelineEpicDependencies } from '../../../timelines/store/timeline/types';

const {
  applyDeltaToColumnWidth,
  changeViewMode,
  removeColumn,
  toggleDetailPanel,
  updateColumnOrder,
  updateColumns,
  updateColumnWidth,
  updateIsLoading,
  updateItemsPerPage,
  updateShowBuildingBlockAlertsFilter,
  updateSort,
  upsertColumn,
} = dataTableActions;

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
  changeViewMode.type,
  updateShowBuildingBlockAlertsFilter.type,
  updateTotalCount.type,
  updateIsLoading.type,
  toggleDetailPanel.type,
];

export const createDataTableLocalStorageEpic =
  <State>(): Epic<Action, Action, State, TimelineEpicDependencies<State>> =>
  (action$, state$, { tableByIdSelector, storage }) => {
    const table$ = state$.pipe(map(tableByIdSelector), filter(isNotNull));
    return action$.pipe(
      delay(500),
      withLatestFrom(table$),
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
