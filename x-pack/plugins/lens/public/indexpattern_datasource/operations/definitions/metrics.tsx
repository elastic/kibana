/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperationDefinition } from './index';
import { FormattedIndexPatternColumn } from './column_types';

type MetricColumn<T> = FormattedIndexPatternColumn & {
  operationType: T;
};

function buildMetricOperation<T extends MetricColumn<string>>({
  type,
  displayName,
  ofName,
  priority,
}: {
  type: T['operationType'];
  displayName: string;
  ofName: (name: string) => string;
  priority?: number;
}) {
  return {
    type,
    priority,
    displayName,
    getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type: fieldType }) => {
      if (
        fieldType === 'number' &&
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
          (!newField.aggregationRestrictions || newField.aggregationRestrictions![type])
      );
    },
    buildColumn: ({ suggestedPriority, field, previousColumn }) => ({
      label: ofName(field.name),
      dataType: 'number',
      operationType: type,
      suggestedPriority,
      sourceField: field.name,
      isBucketed: false,
      scale: 'ratio',
      params:
        previousColumn && previousColumn.dataType === 'number' ? previousColumn.params : undefined,
    }),
    onFieldChange: (oldColumn, indexPattern, field) => {
      return {
        ...oldColumn,
        label: ofName(field.name),
        sourceField: field.name,
      };
    },
    toEsAggsConfig: (column, columnId) => ({
      id: columnId,
      enabled: true,
      type: column.operationType,
      schema: 'metric',
      params: {
        field: column.sourceField,
        missing: 0,
      },
    }),
  } as OperationDefinition<T>;
}

export type SumIndexPatternColumn = MetricColumn<'sum'>;
export type AvgIndexPatternColumn = MetricColumn<'avg'>;
export type MinIndexPatternColumn = MetricColumn<'min'>;
export type MaxIndexPatternColumn = MetricColumn<'max'>;

export const minOperation = buildMetricOperation<MinIndexPatternColumn>({
  type: 'min',
  displayName: i18n.translate('xpack.lens.indexPattern.min', {
    defaultMessage: 'Minimum',
  }),
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.minOf', {
      defaultMessage: 'Minimum of {name}',
      values: { name },
    }),
});

export const maxOperation = buildMetricOperation<MaxIndexPatternColumn>({
  type: 'max',
  displayName: i18n.translate('xpack.lens.indexPattern.max', {
    defaultMessage: 'Maximum',
  }),
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.maxOf', {
      defaultMessage: 'Maximum of {name}',
      values: { name },
    }),
});

export const averageOperation = buildMetricOperation<AvgIndexPatternColumn>({
  type: 'avg',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.avg', {
    defaultMessage: 'Average',
  }),
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.avgOf', {
      defaultMessage: 'Average of {name}',
      values: { name },
    }),
});

export const sumOperation = buildMetricOperation<SumIndexPatternColumn>({
  type: 'sum',
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.sum', {
    defaultMessage: 'Sum',
  }),
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.sumOf', {
      defaultMessage: 'Sum of {name}',
      values: { name },
    }),
});
