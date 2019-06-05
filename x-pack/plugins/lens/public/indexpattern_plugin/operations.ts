/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { DataType } from '../types';
import { IndexPatternField, OperationType } from './indexpattern';

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
  rollupRestrictions,
}: IndexPatternField): OperationType[] {
  if (rollupRestrictions) {
    const validOperations = getOperations();
    return Object.keys(rollupRestrictions).filter(key =>
      // Filter out operations that rollups support, but that aren't yet supported by the client
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
