/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  applyDeltaToColumnWidth,
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
  createDataTable,
  initializeDataTableSettings,
  removeColumn,
  setEventsDeleted,
  setEventsLoading,
  setDataTableSelectAll,
  setSelected,
  toggleDetailPanel,
  updateColumnOrder,
  updateColumns,
  updateColumnWidth,
  updateIsLoading,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  updateSort,
  upsertColumn,
  updateGraphEventId,
  updateSessionViewConfig,
  setTableUpdatedAt,
  updateTotalCount,
} from './actions';

import {
  applyDeltaToTableColumnWidth,
  createInitDataTable,
  setInitializeDataTableSettings,
  removeTableColumn,
  setDeletedTableEvents,
  setLoadingTableEvents,
  setSelectedTableEvents,
  updateDataTableColumnOrder,
  updateDataTableColumnWidth,
  updateTableColumns,
  updateTableItemsPerPage,
  updateTablePerPageOptions,
  updateTableSort,
  upsertTableColumn,
  updateTableDetailsPanel,
  updateTableGraphEventId,
  updateTableSessionViewConfig,
} from './helpers';

import type { TableState } from './types';
import { EMPTY_TABLE_BY_ID } from './types';

const initialDataTableState: TableState = {
  tableById: EMPTY_TABLE_BY_ID,
};

/** The reducer for all data table actions  */
export const dataTableReducer = reducerWithInitialState(initialDataTableState)
  .case(upsertColumn, (state, { column, id, index }) => ({
    ...state,
    tableById: upsertTableColumn({ column, id, index, tableById: state.tableById }),
  }))
  .case(createDataTable, (state, tableProps) => {
    return {
      ...state,
      tableById: createInitDataTable({
        ...tableProps,
        tableById: state.tableById,
      }),
    };
  })
  .case(initializeDataTableSettings, (state, { id, ...dataTableSettingsProps }) => ({
    ...state,
    tableById: setInitializeDataTableSettings({
      id,
      tableById: state.tableById,
      dataTableSettingsProps,
    }),
  }))
  .case(toggleDetailPanel, (state, action) => ({
    ...state,
    tableById: {
      ...state.tableById,
      [action.id]: {
        ...state.tableById[action.id],
        expandedDetail: {
          ...state.tableById[action.id].expandedDetail,
          ...updateTableDetailsPanel(action),
        },
      },
    },
  }))
  .case(applyDeltaToColumnWidth, (state, { id, columnId, delta }) => ({
    ...state,
    tableById: applyDeltaToTableColumnWidth({
      id,
      columnId,
      delta,
      tableById: state.tableById,
    }),
  }))
  .case(updateColumnOrder, (state, { id, columnIds }) => ({
    ...state,
    tableById: updateDataTableColumnOrder({
      columnIds,
      id,
      tableById: state.tableById,
    }),
  }))
  .case(updateColumnWidth, (state, { id, columnId, width }) => ({
    ...state,
    tableById: updateDataTableColumnWidth({
      columnId,
      id,
      tableById: state.tableById,
      width,
    }),
  }))
  .case(removeColumn, (state, { id, columnId }) => ({
    ...state,
    tableById: removeTableColumn({
      id,
      columnId,
      tableById: state.tableById,
    }),
  }))
  .case(setEventsDeleted, (state, { id, eventIds, isDeleted }) => ({
    ...state,
    tableById: setDeletedTableEvents({
      id,
      eventIds,
      tableById: state.tableById,
      isDeleted,
    }),
  }))
  .case(clearEventsDeleted, (state, { id }) => ({
    ...state,
    tableById: {
      ...state.tableById,
      [id]: {
        ...state.tableById[id],
        deletedEventIds: [],
      },
    },
  }))
  .case(setEventsLoading, (state, { id, eventIds, isLoading }) => ({
    ...state,
    tableById: setLoadingTableEvents({
      id,
      eventIds,
      tableById: state.tableById,
      isLoading,
    }),
  }))
  .case(clearEventsLoading, (state, { id }) => ({
    ...state,
    tableById: {
      ...state.tableById,
      [id]: {
        ...state.tableById[id],
        loadingEventIds: [],
      },
    },
  }))
  .case(setSelected, (state, { id, eventIds, isSelected, isSelectAllChecked }) => ({
    ...state,
    tableById: setSelectedTableEvents({
      id,
      eventIds,
      tableById: state.tableById,
      isSelected,
      isSelectAllChecked,
    }),
  }))
  .case(clearSelected, (state, { id }) => ({
    ...state,
    tableById: {
      ...state.tableById,
      [id]: {
        ...state.tableById[id],
        selectedEventIds: {},
        isSelectAllChecked: false,
      },
    },
  }))
  .case(updateIsLoading, (state, { id, isLoading }) => ({
    ...state,
    tableById: {
      ...state.tableById,
      [id]: {
        ...state.tableById[id],
        isLoading,
      },
    },
  }))
  .case(updateColumns, (state, { id, columns }) => ({
    ...state,
    tableById: updateTableColumns({
      id,
      columns,
      tableById: state.tableById,
    }),
  }))
  .case(updateSort, (state, { id, sort }) => ({
    ...state,
    tableById: updateTableSort({ id, sort, tableById: state.tableById }),
  }))
  .case(updateItemsPerPage, (state, { id, itemsPerPage }) => ({
    ...state,
    tableById: updateTableItemsPerPage({
      id,
      itemsPerPage,
      tableById: state.tableById,
    }),
  }))
  .case(updateItemsPerPageOptions, (state, { id, itemsPerPageOptions }) => ({
    ...state,
    tableById: updateTablePerPageOptions({
      id,
      itemsPerPageOptions,
      tableById: state.tableById,
    }),
  }))
  .case(setDataTableSelectAll, (state, { id, selectAll }) => ({
    ...state,
    tableById: {
      ...state.tableById,
      [id]: {
        ...state.tableById[id],
        selectAll,
      },
    },
  }))
  .case(updateGraphEventId, (state, { id, graphEventId }) => ({
    ...state,
    tableById: updateTableGraphEventId({ id, graphEventId, tableById: state.tableById }),
  }))
  .case(updateSessionViewConfig, (state, { id, sessionViewConfig }) => ({
    ...state,
    tableById: updateTableSessionViewConfig({
      id,
      sessionViewConfig,
      tableById: state.tableById,
    }),
  }))
  .case(setTableUpdatedAt, (state, { id, updated }) => ({
    ...state,
    tableById: {
      ...state.tableById,
      [id]: {
        ...state.tableById[id],
        updated,
      },
    },
  }))
  .case(updateTotalCount, (state, { id, totalCount }) => ({
    ...state,
    tableById: {
      ...state.tableById,
      [id]: {
        ...state.tableById[id],
        totalCount,
      },
    },
  }))
  .build();
