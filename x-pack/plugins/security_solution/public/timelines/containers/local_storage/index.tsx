/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DataTablesStorage } from './types';
import { useKibana } from '../../../common/lib/kibana';
import type { ColumnHeaderOptions, TableIdLiteral } from '../../../../common/types/timeline';
import type { TGridModel } from '../../../common/store/data_table/model';

export const LOCAL_STORAGE_TABLE_KEY = 'securityDataTable';
const EMPTY_TABLE = {} as {
  [K in TableIdLiteral]: TGridModel;
};

/**
 * Migrates the value of the column's `width` property to `initialWidth`
 * when `width` is valid, and `initialWidth` is invalid
 */
export const migrateColumnWidthToInitialWidth = (
  column: ColumnHeaderOptions & { width?: number }
) => ({
  ...column,
  initialWidth:
    Number.isInteger(column.width) && !Number.isInteger(column.initialWidth)
      ? column.width
      : column.initialWidth,
});

/**
 * Migrates the value of the column's `label` property to `displayAsText`
 * when `label` is valid, and `displayAsText` is `undefined`
 */
export const migrateColumnLabelToDisplayAsText = (
  column: ColumnHeaderOptions & { label?: string }
) => ({
  ...column,
  displayAsText:
    !isEmpty(column.label) && column.displayAsText == null ? column.label : column.displayAsText,
});

export const getDataTablesInStorageByIds = (storage: Storage, tableIds: TableIdLiteral[]) => {
  const allDataTables = storage.get(LOCAL_STORAGE_TABLE_KEY);

  if (!allDataTables) {
    return EMPTY_TABLE;
  }

  return tableIds.reduce((acc, tableId) => {
    const tableModel = allDataTables[tableId];
    if (!tableModel) {
      return {
        ...acc,
      };
    }

    return {
      ...acc,
      [tableId]: {
        ...tableModel,
        ...(tableModel.sort != null && !Array.isArray(tableModel.sort)
          ? { sort: [tableModel.sort] }
          : {}),
        ...(Array.isArray(tableModel.columns)
          ? {
              columns: tableModel.columns
                .map(migrateColumnWidthToInitialWidth)
                .map(migrateColumnLabelToDisplayAsText),
            }
          : {}),
      },
    };
  }, {} as { [K in TableIdLiteral]: TGridModel });
};

export const getAllDataTablesInStorage = (storage: Storage) =>
  storage.get(LOCAL_STORAGE_TABLE_KEY) ?? {};

export const addTableInStorage = (storage: Storage, id: TableIdLiteral, table: TGridModel) => {
  const tableToStore = cleanStorageDataTable(table);
  const tables = getAllDataTablesInStorage(storage);
  storage.set(LOCAL_STORAGE_TABLE_KEY, {
    ...tables,
    [id]: tableToStore,
  });
};

const cleanStorageDataTable = (table: TGridModel) => {
  // discard unneeded fields to make sure the object serialization works
  const {
    documentType,
    filterManager,
    isLoading,
    loadingText,
    queryFields,
    unit,
    ...tableToStore
  } = table;
  return tableToStore;
};

export const useDataTablesStorage = (): DataTablesStorage => {
  const { storage } = useKibana().services;

  const getAllDataTables: DataTablesStorage['getAllDataTables'] = () =>
    getAllDataTablesInStorage(storage);

  const getDataTablesById: DataTablesStorage['getDataTablesById'] = (id: TableIdLiteral) =>
    getDataTablesInStorageByIds(storage, [id])[id] ?? null;

  const addDataTable: DataTablesStorage['addDataTable'] = (id: TableIdLiteral, table: TGridModel) =>
    addTableInStorage(storage, id, table);

  return { getAllDataTables, getDataTablesById, addDataTable };
};

export type { DataTablesStorage };
