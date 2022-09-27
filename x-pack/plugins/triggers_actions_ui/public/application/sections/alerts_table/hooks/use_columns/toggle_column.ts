/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';

const remove = ({ columnIds, index }: { columnIds: string[]; index: number }) => {
  return [...columnIds.slice(0, index), ...columnIds.slice(index + 1)];
};

const insert = ({
  columnId,
  columnIds,
  defaultColumns,
}: {
  columnId: string;
  columnIds: string[];
  defaultColumns: EuiDataGridColumn[];
}) => {
  const defaultIndex = defaultColumns.findIndex(
    (column: EuiDataGridColumn) => column.id === columnId
  );
  const isInDefaultConfig = defaultIndex >= 0;

  // if the column isn't shown but it's part of the default config
  // insert into the same position as in the default config
  if (isInDefaultConfig) {
    return [...columnIds.slice(0, defaultIndex), columnId, ...columnIds.slice(defaultIndex)];
  }

  // if the column isn't shown and it's not part of the default config
  // push it into the second position. Behaviour copied by t_grid, security
  // does this to insert right after the timestamp column
  return [columnIds[0], columnId, ...columnIds.slice(1)];
};

/**
 * @param param.columnId id of the column to be removed/inserted
 * @param param.columnIds Current array of columnIds in the grid
 * @param param.defaultColumns Those initial columns set up in the configuration before being modified by the user
 * @returns the new list of columns to be shown
 */
export const toggleColumn = ({
  columnId,
  columnIds,
  defaultColumns,
}: {
  columnId: string;
  columnIds: string[];
  defaultColumns: EuiDataGridColumn[];
}): string[] => {
  const currentIndex = columnIds.indexOf(columnId);
  const isVisible = currentIndex >= 0;

  if (isVisible) {
    return remove({ columnIds, index: currentIndex });
  }

  return insert({ defaultColumns, columnId, columnIds });
};
