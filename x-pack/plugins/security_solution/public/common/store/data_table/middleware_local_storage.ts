/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Middleware } from 'redux';
import { get } from 'lodash/fp';

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { dataTableActions, dataTableSelectors } from '@kbn/securitysolution-data-table';
import type { TableIdLiteral } from '@kbn/securitysolution-data-table';
import { updateTotalCount } from '../../../timelines/store/actions';
import { addTableInStorage } from '../../../timelines/containers/local_storage';

import type { State } from '../types';

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

const tableActionTypes = new Set([
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
]);

export const dataTableLocalStorageMiddleware: (storage: Storage) => Middleware<{}, State> =
  (storage: Storage) => (store) => (next) => (action: Action) => {
    // perform the action
    const ret = next(action);

    // persist the data table state when a table action has been performed
    if (tableActionTypes.has(action.type)) {
      const tableById = dataTableSelectors.tableByIdSelector(store.getState());
      const tableId: TableIdLiteral = get('payload.id', action);
      if (tableById && tableById[tableId] && storage) {
        addTableInStorage(storage, tableId, tableById[tableId]);
      }
    }

    return ret;
  };
