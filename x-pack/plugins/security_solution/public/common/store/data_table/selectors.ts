/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createSelector } from 'reselect';
import type { State } from '../types';
import type { TGridModel, TableById } from './model';

const selectTableById = (state: State): TableById => state.dataTable.tableById;

export const tableByIdSelector = createSelector(selectTableById, (tableById) => tableById);

const selectTable = (state: State, tableId: string): TGridModel =>
  state.dataTable.tableById[tableId];

export const getTableByIdSelector = () => createSelector(selectTable, (table) => table);
