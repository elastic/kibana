/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getOr } from 'lodash/fp';
import { createSelector } from 'reselect';
import { tGridDefaults, getTGridManageDefaults } from './defaults';
import type { DataTableState, TableById, TGridModel } from './types';

const selectTableById = (state: DataTableState): TableById => state.dataTable.tableById;

export const tableByIdSelector = createSelector(selectTableById, (tableById) => tableById);

const selectTable = (state: DataTableState, tableId: string): TGridModel =>
  state.dataTable.tableById[tableId];

export const getTableByIdSelector = () => createSelector(selectTable, (table) => table);

const getDefaultTgrid = (id: string) => ({ ...tGridDefaults, ...getTGridManageDefaults(id) });

const selectTGridById = (state: unknown, tableId: string): TGridModel => {
  return getOr(
    getOr(getDefaultTgrid(tableId), ['tableById', tableId], state),
    ['dataTable', 'tableById', tableId],
    state
  );
};

export const getTGridByIdSelector = () => createSelector(selectTGridById, (tGrid) => tGrid);

export const getManageDataTableById = () =>
  createSelector(
    selectTGridById,
    ({
      dataViewId,
      defaultColumns,
      isLoading,
      loadingText,
      queryFields,
      title,
      selectAll,
      graphEventId,
    }) => ({
      dataViewId,
      defaultColumns,
      isLoading,
      loadingText,
      queryFields,
      title,
      selectAll,
      graphEventId,
    })
  );
