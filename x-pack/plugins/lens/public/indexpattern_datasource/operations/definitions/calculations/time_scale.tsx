/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  FormattedIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
} from '../column_types';
import { getErrorsForDateReference } from './utils';
import type { OperationDefinition } from '..';
import { combineErrorMessages, getFormatFromPreviousColumn } from '../helpers';
import { IndexPatternLayer } from '../../../types';
import { getDisallowedPreviousShiftMessage } from '../../../time_shift_utils';

type OverallMetricIndexPatternColumn<T extends string> = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: T;
  };

export type OverallSumIndexPatternColumn = OverallMetricIndexPatternColumn<'overall_sum'>;
export type OverallMinIndexPatternColumn = OverallMetricIndexPatternColumn<'overall_min'>;
export type OverallMaxIndexPatternColumn = OverallMetricIndexPatternColumn<'overall_max'>;
export type OverallAverageIndexPatternColumn = OverallMetricIndexPatternColumn<'overall_average'>;

export type TimeScaleIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'time_scale';
    params: {
      unit?: string;
    };
  };

export const timeScaleOperation: OperationDefinition<TimeScaleIndexPatternColumn, 'fullReference'> =
  {
    type: 'time_scale',
    priority: 1,
    displayName: i18n.translate('xpack.lens.indexPattern.timeScale', {
      defaultMessage: 'Time scale',
    }),
    input: 'fullReference',
    selectionStyle: 'hidden',
    requiredReferences: [
      {
        input: ['field', 'managedReference', 'fullReference'],
        validateMetadata: (meta) => meta.dataType === 'number' && !meta.isBucketed,
      },
    ],
    operationParams: [{ name: 'unit', type: 'string', required: true }],
    getPossibleOperation: () => {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    },
    getDefaultLabel: (column, indexPattern, columns) => {
      return 'time_scale';
    },
    toExpression: (layer, columnId) => {
      const currentColumn = layer.columns[columnId] as unknown as TimeScaleIndexPatternColumn;
      const buckets = layer.columnOrder.filter((colId) => layer.columns[colId].isBucketed);
      const dateColumn = buckets.find(
        (colId) => layer.columns[colId].operationType === 'date_histogram'
      )!;
      return [
        {
          type: 'function',
          function: 'lens_time_scale',
          arguments: {
            dateColumnId: [dateColumn],
            inputColumnId: [currentColumn.references[0]],
            outputColumnId: [columnId],
            outputColumnName: [currentColumn.label],
            targetUnit: [currentColumn.params.unit!],
          },
        },
      ];
    },
    buildColumn: ({ referenceIds, previousColumn, layer, indexPattern }, columnParams) => {
      return {
        label: 'Time scale',
        dataType: 'number',
        operationType: 'time_scale',
        isBucketed: false,
        scale: 'ratio',
        references: referenceIds,
        params: {
          ...getFormatFromPreviousColumn(previousColumn),
          unit: columnParams?.unit,
        },
      };
    },
    isTransferable: () => {
      return true;
    },
    getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
      return combineErrorMessages([
        getErrorsForDateReference(
          layer,
          columnId,
          i18n.translate('xpack.lens.indexPattern.timeScale', {
            defaultMessage: 'Time scale',
          })
        ),
        getDisallowedPreviousShiftMessage(layer, columnId),
        !(layer.columns[columnId] as TimeScaleIndexPatternColumn).params.unit
          ? [
              i18n.translate('xpack.lens.indexPattern.timeScale.missingUnit', {
                defaultMessage: 'No unit specified for time scale',
              }),
            ]
          : [],
      ]);
    },
    filterable: false,
    shiftable: false,
    documentation: {
      section: 'calculation',
      signature: i18n.translate('xpack.lens.indexPattern.time_scale', {
        defaultMessage: 'metric: number, unit: s|m|h|d|w|M|y',
      }),
      description: i18n.translate('xpack.lens.indexPattern.time_scale.documentation.markdown', {
        defaultMessage: `

    Normalizes a metric to always be shown by a certain time unit independently of the actual interval of the underlying date histogram.

This function can only be used if there's a date histogram function used in the current chart.

Example: Sum of bytes per second, independent of date histogram interval
\`time_scale(sum(bytes), unit='s')\`

Example: Adding a counter metric and a gauge metric:
\`time_scale(counter_rate(max(in_bytes)), unit=s) + last_value(internal_traffic_speed)\`
      `,
      }),
    },
  };
