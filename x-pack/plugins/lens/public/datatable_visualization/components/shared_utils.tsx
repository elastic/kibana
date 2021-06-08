/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from 'src/plugins/expressions';
import { getOriginalId } from '../transpose_helpers';

export function getNumericValue(
  rowValue: number | number[] | undefined,
  arrayStrategy: 'skip' | 'first' | 'last' = 'skip'
) {
  if (rowValue == null) {
    return;
  }
  if (!Array.isArray(rowValue)) {
    return rowValue;
  }
  if (arrayStrategy === 'skip') {
    return;
  }
  if (arrayStrategy === 'first') {
    return rowValue[0];
  }
  // last
  return rowValue[rowValue.length - 1];
}

export const findMinMaxByColumnId = (
  columnIds: string[],
  table: Datatable | undefined,
  arrayStrategy: 'skip' | 'first' | 'last' = 'skip'
) => {
  const minMax: Record<string, { min: number; max: number; fallback?: boolean }> = {};

  if (table != null) {
    for (const columnId of columnIds) {
      const originalId = getOriginalId(columnId);
      minMax[originalId] = minMax[originalId] || { max: -Infinity, min: Infinity };
      table.rows.forEach((row) => {
        const rowValue = row[columnId];
        const numericValue = getNumericValue(rowValue, arrayStrategy);
        if (numericValue != null) {
          if (minMax[originalId].min > numericValue) {
            minMax[originalId].min = numericValue;
          }
          if (minMax[originalId].max < numericValue) {
            minMax[originalId].max = numericValue;
          }
        }
      });
      // what happens when there's no data in the table? Fallback to a percent range
      if (minMax[originalId].max === -Infinity) {
        minMax[originalId] = { max: 100, min: 0, fallback: true };
      }
    }
  }
  return minMax;
};
