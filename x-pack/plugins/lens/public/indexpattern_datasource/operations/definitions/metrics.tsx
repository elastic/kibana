/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { buildExpressionFunction } from '../../../../../../../src/plugins/expressions/public';
import { OperationDefinition } from './index';
import { getInvalidFieldMessage } from './helpers';
import {
  FormattedIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  BaseIndexPatternColumn,
} from './column_types';
import {
  adjustTimeScaleLabelSuffix,
  adjustTimeScaleOnOtherColumnChange,
} from '../time_scale_utils';

type MetricColumn<T> = FormattedIndexPatternColumn &
  FieldBasedIndexPatternColumn & {
    operationType: T;
  };

const typeToFn: Record<string, string> = {
  min: 'aggMin',
  max: 'aggMax',
  avg: 'aggAvg',
  sum: 'aggSum',
};

function buildMetricOperation<T extends MetricColumn<string>>({
  type,
  displayName,
  ofName,
  priority,
  optionalTimeScaling,
}: {
  type: T['operationType'];
  displayName: string;
  ofName: (name: string) => string;
  priority?: number;
  optionalTimeScaling?: boolean;
}) {
  const labelLookup = (name: string, column?: BaseIndexPatternColumn) => {
    const rawLabel = ofName(name);
    if (!optionalTimeScaling) {
      return rawLabel;
    }
    return adjustTimeScaleLabelSuffix(rawLabel, undefined, column?.timeScale);
  };

  return {
    type,
    priority,
    displayName,
    input: 'field',
    timeScalingMode: optionalTimeScaling ? 'optional' : undefined,
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
      const newField = newIndexPattern.getFieldByName(column.sourceField);

      return Boolean(
        newField &&
          newField.type === 'number' &&
          newField.aggregatable &&
          (!newField.aggregationRestrictions || newField.aggregationRestrictions![type])
      );
    },
    onOtherColumnChanged: (column, otherColumns) =>
      optionalTimeScaling ? adjustTimeScaleOnOtherColumnChange(column, otherColumns) : column,
    getDefaultLabel: (column, indexPattern, columns) =>
      labelLookup(indexPattern.getFieldByName(column.sourceField)!.displayName, column),
    buildColumn: ({ field, previousColumn }) => ({
      label: labelLookup(field.displayName, previousColumn),
      dataType: 'number',
      operationType: type,
      sourceField: field.name,
      isBucketed: false,
      scale: 'ratio',
      timeScale: optionalTimeScaling ? previousColumn?.timeScale : undefined,
      params:
        previousColumn && previousColumn.dataType === 'number' ? previousColumn.params : undefined,
    }),
    onFieldChange: (oldColumn, field) => {
      return {
        ...oldColumn,
        label: labelLookup(field.displayName, oldColumn),
        sourceField: field.name,
      };
    },
    toEsAggsFn: (column, columnId, _indexPattern) => {
      return buildExpressionFunction(typeToFn[type], {
        id: columnId,
        enabled: true,
        schema: 'metric',
        field: column.sourceField,
      }).toAst();
    },
    getErrorMessage: (layer, columnId, indexPattern) =>
      getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
  } as OperationDefinition<T, 'field'>;
}

export type SumIndexPatternColumn = MetricColumn<'sum'>;
export type AvgIndexPatternColumn = MetricColumn<'avg'>;
export type MinIndexPatternColumn = MetricColumn<'min'>;
export type MaxIndexPatternColumn = MetricColumn<'max'>;
export type MedianIndexPatternColumn = MetricColumn<'median'>;

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
  optionalTimeScaling: true,
});

export const medianOperation = buildMetricOperation<MedianIndexPatternColumn>({
  type: 'median',
  displayName: i18n.translate('xpack.lens.indexPattern.median', {
    defaultMessage: 'Median',
  }),
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.medianOf', {
      defaultMessage: 'Median of {name}',
      values: { name },
    }),
});
