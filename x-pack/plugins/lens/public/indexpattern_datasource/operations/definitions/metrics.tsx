/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { buildExpressionFunction } from '../../../../../../../src/plugins/expressions/public';
import { OperationDefinition } from './index';
import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  getFilter,
} from './helpers';
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
  average: 'aggAvg',
  sum: 'aggSum',
  median: 'aggMedian',
};

const supportedTypes = ['number', 'histogram'];

function buildMetricOperation<T extends MetricColumn<string>>({
  type,
  displayName,
  description,
  ofName,
  priority,
  optionalTimeScaling,
}: {
  type: T['operationType'];
  displayName: string;
  ofName: (name: string) => string;
  priority?: number;
  optionalTimeScaling?: boolean;
  description?: string;
}) {
  const labelLookup = (name: string, column?: BaseIndexPatternColumn) => {
    const label = ofName(name);
    return adjustTimeScaleLabelSuffix(
      label,
      undefined,
      optionalTimeScaling ? column?.timeScale : undefined,
      undefined,
      column?.timeShift
    );
  };

  return {
    type,
    priority,
    displayName,
    description,
    input: 'field',
    timeScalingMode: optionalTimeScaling ? 'optional' : undefined,
    getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type: fieldType }) => {
      if (
        supportedTypes.includes(fieldType) &&
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
          supportedTypes.includes(newField.type) &&
          newField.aggregatable &&
          (!newField.aggregationRestrictions || newField.aggregationRestrictions![type])
      );
    },
    onOtherColumnChanged: (layer, thisColumnId, changedColumnId) =>
      optionalTimeScaling
        ? (adjustTimeScaleOnOtherColumnChange(layer, thisColumnId, changedColumnId) as T)
        : (layer.columns[thisColumnId] as T),
    getDefaultLabel: (column, indexPattern, columns) =>
      labelLookup(getSafeName(column.sourceField, indexPattern), column),
    buildColumn: ({ field, previousColumn }, columnParams) => {
      return {
        label: labelLookup(field.displayName, previousColumn),
        dataType: 'number',
        operationType: type,
        sourceField: field.name,
        isBucketed: false,
        scale: 'ratio',
        timeScale: optionalTimeScaling ? previousColumn?.timeScale : undefined,
        filter: getFilter(previousColumn, columnParams),
        timeShift: previousColumn?.timeShift,
        params: getFormatFromPreviousColumn(previousColumn),
      } as T;
    },
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
        // time shift is added to wrapping aggFilteredMetric if filter is set
        timeShift: column.filter ? undefined : column.timeShift,
      }).toAst();
    },
    getErrorMessage: (layer, columnId, indexPattern) =>
      getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
    filterable: true,
    documentation: {
      section: 'elasticsearch',
      signature: i18n.translate('xpack.lens.indexPattern.metric.signature', {
        defaultMessage: 'field: string',
      }),
      description: i18n.translate('xpack.lens.indexPattern.metric.documentation', {
        defaultMessage: `
Returns the {metric} of a field. This function only works for number fields.

Example: Get the {metric} of price:
\`{metric}(price)\`

Example: Get the {metric} of price for orders from the UK:
\`{metric}(price, kql='location:UK')\`
      `,
        values: {
          metric: type,
        },
      }),
    },
    shiftable: true,
  } as OperationDefinition<T, 'field'>;
}

export type SumIndexPatternColumn = MetricColumn<'sum'>;
export type AvgIndexPatternColumn = MetricColumn<'average'>;
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
  description: i18n.translate('xpack.lens.indexPattern.min.description', {
    defaultMessage:
      'A single-value metrics aggregation that returns the minimum value among the numeric values extracted from the aggregated documents.',
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
  description: i18n.translate('xpack.lens.indexPattern.max.description', {
    defaultMessage:
      'A single-value metrics aggregation that returns the maximum value among the numeric values extracted from the aggregated documents.',
  }),
});

export const averageOperation = buildMetricOperation<AvgIndexPatternColumn>({
  type: 'average',
  priority: 2,
  displayName: i18n.translate('xpack.lens.indexPattern.avg', {
    defaultMessage: 'Average',
  }),
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.avgOf', {
      defaultMessage: 'Average of {name}',
      values: { name },
    }),
  description: i18n.translate('xpack.lens.indexPattern.avg.description', {
    defaultMessage:
      'A single-value metric aggregation that computes the average of numeric values that are extracted from the aggregated documents',
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
  description: i18n.translate('xpack.lens.indexPattern.sum.description', {
    defaultMessage:
      'A single-value metrics aggregation that sums up numeric values that are extracted from the aggregated documents.',
  }),
});

export const medianOperation = buildMetricOperation<MedianIndexPatternColumn>({
  type: 'median',
  priority: 3,
  displayName: i18n.translate('xpack.lens.indexPattern.median', {
    defaultMessage: 'Median',
  }),
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.medianOf', {
      defaultMessage: 'Median of {name}',
      values: { name },
    }),
  description: i18n.translate('xpack.lens.indexPattern.median.description', {
    defaultMessage:
      'A single-value metrics aggregation that computes the median value that are extracted from the aggregated documents.',
  }),
});
