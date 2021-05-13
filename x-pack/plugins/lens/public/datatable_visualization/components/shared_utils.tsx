/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from 'src/plugins/expressions';
import { getOriginalId } from '../transpose_helpers';

export const findMinMaxByColumnId = (columnIds: string[], table: Datatable | undefined) => {
  const minMax: Record<string, { min: number; max: number }> = {};

  if (table != null) {
    for (const columnId of columnIds) {
      const originalId = getOriginalId(columnId);
      minMax[originalId] = minMax[originalId] || { max: -Infinity, min: Infinity };
      table.rows.forEach((row) => {
        const rowValue = row[columnId];
        if (rowValue != null) {
          if (minMax[originalId].min > rowValue) {
            minMax[originalId].min = rowValue;
          }
          if (minMax[originalId].max < rowValue) {
            minMax[originalId].max = rowValue;
          }
        }
      });
    }
  }
  return minMax;
};
