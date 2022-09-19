/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TableById, TGridModel } from '@kbn/timelines-plugin/public/types';
import { createSelector } from 'reselect';
import type { State } from '../../../common/store/types';
import { tableDefaults } from '../timeline/defaults';

export { getManageDataTableById, getTGridByIdSelector } from '@kbn/timelines-plugin/public';

const selectTableById = (state: State): TableById => state.dataTable.tableById;

export const tableByIdSelector = createSelector(selectTableById, (tableById) => tableById);

export const selectTable = (state: State, tableId: string): TGridModel =>
  state.dataTable.tableById[tableId] ?? tableDefaults;

export const getTableByIdSelector = () => createSelector(selectTable, (table) => table);
