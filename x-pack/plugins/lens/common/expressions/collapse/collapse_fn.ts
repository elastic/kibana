/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DatatableRow,
  getBucketIdentifier,
} from '../../../../../../src/plugins/expressions/common';
import type { CollapseExpressionFunction } from './types';

function getValueAsNumberArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((innerVal) => Number(innerVal));
  } else {
    return [Number(value)];
  }
}

export const collapseFn: CollapseExpressionFunction['fn'] = (input, { by, metric, fn }) => {
  const accumulators: Record<string, Partial<Record<string, number>>> = {};
  const valueCounter: Record<string, Partial<Record<string, number>>> = {};
  metric?.forEach((m) => {
    accumulators[m] = {};
    valueCounter[m] = {};
  });
  const setMarker: Partial<Record<string, boolean>> = {};
  input.rows.forEach((row) => {
    const bucketIdentifier = getBucketIdentifier(row, by);

    metric?.forEach((m) => {
      const accumulatorValue = accumulators[m][bucketIdentifier];
      const currentValue = row[m];
      if (currentValue != null) {
        const currentNumberValues = getValueAsNumberArray(currentValue);
        switch (fn) {
          case 'avg':
            valueCounter[m][bucketIdentifier] =
              (valueCounter[m][bucketIdentifier] ?? 0) + currentNumberValues.length;
          case 'sum':
            accumulators[m][bucketIdentifier] = currentNumberValues.reduce(
              (a, b) => a + b,
              accumulatorValue || 0
            );
            break;
          case 'min':
            if (typeof accumulatorValue !== 'undefined') {
              accumulators[m][bucketIdentifier] = Math.min(
                accumulatorValue,
                ...currentNumberValues
              );
            } else {
              accumulators[m][bucketIdentifier] = Math.min(...currentNumberValues);
            }
            break;
          case 'max':
            if (typeof accumulatorValue !== 'undefined') {
              accumulators[m][bucketIdentifier] = Math.max(
                accumulatorValue,
                ...currentNumberValues
              );
            } else {
              accumulators[m][bucketIdentifier] = Math.max(...currentNumberValues);
            }
            break;
        }
      }
    });
  });
  if (fn === 'avg') {
    metric?.forEach((m) => {
      Object.keys(accumulators[m]).forEach((bucketIdentifier) => {
        const accumulatorValue = accumulators[m][bucketIdentifier];
        const valueCount = valueCounter[m][bucketIdentifier];
        if (typeof accumulatorValue !== 'undefined' && typeof valueCount !== 'undefined') {
          accumulators[m][bucketIdentifier] = accumulatorValue / valueCount;
        }
      });
    });
  }

  return {
    ...input,
    columns: input.columns.filter((c) => by?.indexOf(c.id) !== -1 && metric?.indexOf(c.id) !== -1),
    rows: input.rows
      .map((row) => {
        const bucketIdentifier = getBucketIdentifier(row, by);
        if (setMarker[bucketIdentifier]) return undefined;
        setMarker[bucketIdentifier] = true;
        const newRow = { ...row };
        metric?.forEach((m) => {
          newRow[m] = accumulators[m][bucketIdentifier];
        });

        return newRow;
      })
      .filter(Boolean) as DatatableRow[],
  };
};
