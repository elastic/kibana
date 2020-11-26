/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionAST } from '@kbn/interpreter/common';
import { IndexPattern, IndexPatternLayer } from '../../../types';
import { ReferenceBasedIndexPatternColumn } from '../column_types';

/**
 * Checks whether the current layer includes a date histogram and returns an error otherwise
 */
export function checkForDateHistogram(layer: IndexPatternLayer, name: string) {
  const buckets = layer.columnOrder.filter((colId) => layer.columns[colId].isBucketed);
  const hasDateHistogram = buckets.some(
    (colId) => layer.columns[colId].operationType === 'date_histogram'
  );
  if (hasDateHistogram) {
    return undefined;
  }
  return [
    i18n.translate('xpack.lens.indexPattern.calculations.dateHistogramErrorMessage', {
      defaultMessage:
        '{name} requires a date histogram to work. Choose a different function or add a date histogram.',
      values: {
        name,
      },
    }),
  ];
}

export function hasDateField(indexPattern: IndexPattern) {
  return indexPattern.fields.some((field) => field.type === 'date');
}

/**
 * Creates an expression ast for a date based operation (cumulative sum, derivative, moving average, counter rate)
 */
export function dateBasedOperationToExpression(
  layer: IndexPatternLayer,
  columnId: string,
  functionName: string,
  additionalArgs: Record<string, unknown[]> = {}
): ExpressionFunctionAST[] {
  const currentColumn = (layer.columns[columnId] as unknown) as ReferenceBasedIndexPatternColumn;
  const buckets = layer.columnOrder.filter((colId) => layer.columns[colId].isBucketed);
  const dateColumnIndex = buckets.findIndex(
    (colId) => layer.columns[colId].operationType === 'date_histogram'
  )!;
  buckets.splice(dateColumnIndex, 1);

  return [
    {
      type: 'function',
      function: functionName,
      arguments: {
        by: buckets,
        inputColumnId: [currentColumn.references[0]],
        outputColumnId: [columnId],
        outputColumnName: [currentColumn.label],
        ...additionalArgs,
      },
    },
  ];
}
