/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';

const remove = ({ columns, index }: { columns: EuiDataGridColumn[]; index: number }) => {
  return [...columns.slice(0, index), ...columns.slice(index + 1)];
};

const insert = ({
  column,
  columns,
  defaultColumns,
}: {
  column: EuiDataGridColumn;
  columns: EuiDataGridColumn[];
  defaultColumns: EuiDataGridColumn[];
}) => {
  const defaultIndex = defaultColumns.findIndex(
    (defaultColumn: EuiDataGridColumn) => defaultColumn.id === column.id
  );
  const isInDefaultConfig = defaultIndex >= 0;

  // if the column isn't shown but it's part of the default config
  // insert into the same position as in the default config
  if (isInDefaultConfig) {
    return [...columns.slice(0, defaultIndex), column, ...columns.slice(defaultIndex)];
  }

  // if the column isn't shown and it's not part of the default config
  // push it into the second position. Behaviour copied by t_grid, security
  // does this to insert right after the timestamp column
  return [columns[0], column, ...columns.slice(1)];
};

/**
 * @param param.column column to be removed/inserted
 * @param param.columns current array of columns in the grid
 * @param param.defaultColumns Initial columns set up in the configuration before being modified by the user
 * @returns the new list of columns
 */
export const toggleColumn = ({
  column,
  columns,
  defaultColumns,
}: {
  column: EuiDataGridColumn;
  columns: EuiDataGridColumn[];
  defaultColumns: EuiDataGridColumn[];
}): EuiDataGridColumn[] => {
  const currentIndex = columns.findIndex(
    (currentColumn: EuiDataGridColumn) => currentColumn.id === column.id
  );
  const isVisible = currentIndex >= 0;

  if (isVisible) {
    return remove({ columns, index: currentIndex });
  }

  return insert({ defaultColumns, column, columns });
};
