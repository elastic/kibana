/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { DataType, DimensionPriority } from '../types';
import {
  IndexPatternColumn,
  IndexPatternField,
  IndexPatternPrivateState,
  OperationType,
} from './indexpattern';

export function getOperations(): OperationType[] {
  return ['value', 'terms', 'date_histogram', 'sum', 'avg', 'min', 'max', 'count'];
}

export function getOperationDisplay(): Record<
  OperationType,
  {
    type: OperationType;
    displayName: string;
    ofName: (name: string) => string;
  }
> {
  return {
    value: {
      type: 'value',
      displayName: i18n.translate('xpack.lens.indexPattern.value', {
        defaultMessage: 'Value',
      }),
      ofName: name =>
        i18n.translate('xpack.lens.indexPattern.valueOf', {
          defaultMessage: 'Value of {name}',
          values: { name },
        }),
    },
    terms: {
      type: 'terms',
      displayName: i18n.translate('xpack.lens.indexPattern.terms', {
        defaultMessage: 'Top Values',
      }),
      ofName: name =>
        i18n.translate('xpack.lens.indexPattern.termsOf', {
          defaultMessage: 'Top Values of {name}',
          values: { name },
        }),
    },
    date_histogram: {
      type: 'date_histogram',
      displayName: i18n.translate('xpack.lens.indexPattern.dateHistogram', {
        defaultMessage: 'Date Histogram',
      }),
      ofName: name =>
        i18n.translate('xpack.lens.indexPattern.dateHistogramOf', {
          defaultMessage: 'Date Histogram of {name}',
          values: { name },
        }),
    },
    sum: {
      type: 'sum',
      displayName: i18n.translate('xpack.lens.indexPattern.sum', {
        defaultMessage: 'Sum',
      }),
      ofName: name =>
        i18n.translate('xpack.lens.indexPattern.sumOf', {
          defaultMessage: 'Sum of {name}',
          values: { name },
        }),
    },
    avg: {
      type: 'avg',
      displayName: i18n.translate('xpack.lens.indexPattern.average', {
        defaultMessage: 'Average',
      }),
      ofName: name =>
        i18n.translate('xpack.lens.indexPattern.averageOf', {
          defaultMessage: 'Average of {name}',
          values: { name },
        }),
    },
    min: {
      type: 'min',
      displayName: i18n.translate('xpack.lens.indexPattern.min', {
        defaultMessage: 'Minimum',
      }),
      ofName: name =>
        i18n.translate('xpack.lens.indexPattern.minOf', {
          defaultMessage: 'Minimum of {name}',
          values: { name },
        }),
    },
    max: {
      type: 'max',
      displayName: i18n.translate('xpack.lens.indexPattern.max', {
        defaultMessage: 'Maximum',
      }),
      ofName: name =>
        i18n.translate('xpack.lens.indexPattern.maxOf', {
          defaultMessage: 'Maximum of {name}',
          values: { name },
        }),
    },
    count: {
      type: 'count',
      displayName: i18n.translate('xpack.lens.indexPattern.count', {
        defaultMessage: 'Count',
      }),
      ofName: name =>
        i18n.translate('xpack.lens.indexPattern.countOf', {
          defaultMessage: 'Count of {name}',
          values: { name },
        }),
    },
  };
}

export function getOperationTypesForField({
  type,
  aggregationRestrictions,
}: IndexPatternField): OperationType[] {
  if (aggregationRestrictions) {
    const validOperations = getOperations();
    return Object.keys(aggregationRestrictions).filter(key =>
      // Filter out operations that are available, but that aren't yet supported by the client
      validOperations.includes(key as OperationType)
    ) as OperationType[];
  }

  switch (type) {
    case 'date':
      return ['value', 'date_histogram'];
    case 'number':
      return ['value', 'sum', 'avg', 'min', 'max'];
    case 'string':
      return ['value', 'terms'];
  }
  return [];
}

export function getOperationResultType({ type }: IndexPatternField, op: OperationType): DataType {
  switch (op) {
    case 'value':
      return type as DataType;
    case 'avg':
    case 'min':
    case 'max':
    case 'count':
    case 'sum':
      return 'number';
    case 'date_histogram':
      return 'date';
    case 'terms':
      return 'string';
  }
}

export function getPotentialColumns(
  state: IndexPatternPrivateState,
  suggestedOrder?: DimensionPriority
): IndexPatternColumn[] {
  const fields = state.indexPatterns[state.currentIndexPatternId].fields;

  const operationPanels = getOperationDisplay();

  const columns: IndexPatternColumn[] = fields
    .map((field, index) => {
      const validOperations = getOperationTypesForField(field);

      return validOperations.map(op => ({
        operationId: `${index}${op}`,
        label: operationPanels[op].ofName(field.name),
        dataType: getOperationResultType(field, op),
        isBucketed: op === 'terms' || op === 'date_histogram',

        operationType: op,
        sourceField: field.name,
        suggestedOrder,
      }));
    })
    .reduce((prev, current) => prev.concat(current));

  columns.push({
    operationId: 'count',
    label: i18n.translate('xpack.lens.indexPatternOperations.countOfDocuments', {
      defaultMessage: 'Count of Documents',
    }),
    dataType: 'number',
    isBucketed: false,

    operationType: 'count',
    sourceField: 'documents',
    suggestedOrder,
  });

  columns.sort(({ sourceField }, { sourceField: sourceField2 }) =>
    sourceField.localeCompare(sourceField2)
  );

  return columns;
}

export function getColumnOrder(columns: Record<string, IndexPatternColumn>): string[] {
  const entries = Object.entries(columns);

  const [aggregations, metrics] = _.partition(entries, col => col[1].isBucketed);

  return aggregations
    .sort(([id, col], [id2, col2]) => {
      return (
        // Sort undefined orders last
        (col.suggestedOrder !== undefined ? col.suggestedOrder : Number.MAX_SAFE_INTEGER) -
        (col2.suggestedOrder !== undefined ? col2.suggestedOrder : Number.MAX_SAFE_INTEGER)
      );
    })
    .map(([id]) => id)
    .concat(metrics.map(([id]) => id));
}
