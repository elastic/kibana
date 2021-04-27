/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from 'src/plugins/expressions';

export const findMinMaxByColumnId = (columnIds: string[], table: Datatable | undefined) => {
  const minMax: Record<string, { min: number; max: number }> = {};

  if (table != null) {
    for (const columnId of columnIds) {
      minMax[columnId] = minMax[columnId] || { max: -Infinity, min: Infinity };
      table.rows.forEach((row) => {
        const rowValue = row[columnId];
        if (rowValue != null) {
          if (minMax[columnId].min > rowValue) {
            minMax[columnId].min = rowValue;
          }
          if (minMax[columnId].max < rowValue) {
            minMax[columnId].max = rowValue;
          }
        }
      });
    }
  }
  return minMax;
};
