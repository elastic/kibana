/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionAST } from '@kbn/interpreter/common';
import type { TimeScaleUnit } from '../../../time_scale';
import type { IndexPattern, IndexPatternLayer } from '../../../types';
import { adjustTimeScaleLabelSuffix } from '../../time_scale_utils';
import type { ReferenceBasedIndexPatternColumn } from '../column_types';
import { isColumnValidAsReference } from '../../layer_helpers';
import { operationDefinitionMap } from '..';

export const buildLabelFunction = (ofName: (name?: string) => string) => (
  name?: string,
  timeScale?: TimeScaleUnit
) => {
  const rawLabel = ofName(name);
  return adjustTimeScaleLabelSuffix(rawLabel, undefined, timeScale);
};

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

export function checkReferences(layer: IndexPatternLayer, columnId: string) {
  const column = layer.columns[columnId] as ReferenceBasedIndexPatternColumn;

  const errors: string[] = [];

  column.references.forEach((referenceId, index) => {
    if (!layer.columns[referenceId]) {
      errors.push(
        i18n.translate('xpack.lens.indexPattern.missingReferenceError', {
          defaultMessage: '"{dimensionLabel}" is not fully configured',
          values: {
            dimensionLabel: column.label,
          },
        })
      );
    } else {
      const referenceColumn = layer.columns[referenceId]!;
      const definition = operationDefinitionMap[column.operationType];
      if (definition.input !== 'fullReference') {
        throw new Error('inconsistent state - column is not a reference operation');
      }
      const requirements = definition.requiredReferences[index];
      const isValid = isColumnValidAsReference({
        validation: requirements,
        column: referenceColumn,
      });

      if (!isValid) {
        errors.push(
          i18n.translate('xpack.lens.indexPattern.invalidReferenceConfiguration', {
            defaultMessage: 'Dimension "{dimensionLabel}" is configured incorrectly',
            values: {
              dimensionLabel: column.label,
            },
          })
        );
      }
    }
  });
  return errors.length ? errors : undefined;
}

export function getErrorsForDateReference(
  layer: IndexPatternLayer,
  columnId: string,
  name: string
) {
  const dateErrors = checkForDateHistogram(layer, name) ?? [];
  const referenceErrors = checkReferences(layer, columnId) ?? [];
  if (dateErrors.length || referenceErrors.length) {
    return [...dateErrors, ...referenceErrors];
  }
  return;
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
