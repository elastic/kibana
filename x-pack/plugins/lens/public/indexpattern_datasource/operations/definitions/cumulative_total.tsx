/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from '.';
import { FieldBasedIndexPatternColumn } from './column_types';

const SCALE = 'ratio';
const OPERATION_TYPE = 'cumulativeTotal';
const IS_BUCKETED = false;

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.cumulativeTotalOf', {
    defaultMessage: 'Cumulative total of {name}',
    values: { name },
  });
}

export interface CumulativeTotalOperation extends FieldBasedIndexPatternColumn {
  operationType: 'cumulativeTotal';
}

export const cumulativeTotalOperation: OperationDefinition<CumulativeTotalOperation> = {
  type: OPERATION_TYPE,
  displayName: i18n.translate('xpack.lens.indexPattern.cumulativeTotal', {
    defaultMessage: 'Cumulative total',
  }),
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (type === 'document') {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
    if (
      type === 'number' &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions[type])
    ) {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.fields.find((field) => field.name === column.sourceField);

    return Boolean(
      newField &&
        newField.type === 'number' &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.cardinality)
    );
  },
  buildColumn({ suggestedPriority, field }) {
    return {
      label: ofName(field.name),
      dataType: 'number',
      operationType: OPERATION_TYPE,
      scale: SCALE,
      suggestedPriority,
      sourceField: field.name,
      isBucketed: IS_BUCKETED,
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'cumulative_sum',
    schema: 'metric',
    params: {
      metricAgg: columnId + '-parent',
      customMetric:
        column.sourceField === 'Records'
          ? {
              id: columnId + '-parent',
              enabled: true,
              type: 'count',
              schema: 'metric',
              params: {},
            }
          : {
              id: columnId + '-parent',
              enabled: true,
              type: 'sum',
              schema: 'metric',
              params: {
                field: column.sourceField,
                missing: 0,
              },
            },
    },
  }),
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: ofName(field.name),
      sourceField: field.name,
    };
  },
};
