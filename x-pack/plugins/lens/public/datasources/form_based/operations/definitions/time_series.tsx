/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { AggFunctionsMapping } from '@kbn/data-plugin/public';
import { buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { BaseIndexPatternColumn, OperationDefinition } from '.';

export interface TimeSeriesIndexPatternColumn extends BaseIndexPatternColumn {
  operationType: 'time_series';
  params: {};
}

export type TimeSeriesColumnParams = TimeSeriesIndexPatternColumn['params'];
export type UpdateParamsFnType = <K extends keyof TimeSeriesColumnParams>(
  paramName: K,
  value: TimeSeriesColumnParams[K]
) => void;

export const timeSeriesOperation: OperationDefinition<
  TimeSeriesIndexPatternColumn,
  'none',
  TimeSeriesColumnParams
> = {
  type: 'time_series',
  displayName: i18n.translate('xpack.lens.indexPattern.timeSeries', {
    defaultMessage: 'All Series',
  }),
  priority: 4, // Higher than terms, so numbers get histogram
  input: 'none',
  getPossibleOperation: (index) => {
    if (index.fields.find((f) => f.timeSeriesDimension || f.timeSeriesMetric)) {
      return {
        dataType: 'string',
        isBucketed: true,
        scale: 'ordinal',
      };
    }
  },
  getDefaultLabel: () => 'Time Series',
  buildColumn() {
    return {
      label: 'series',
      dataType: 'string',
      operationType: 'time_series',
      isBucketed: true,
      scale: 'ordinal', // ordinal for Range
      params: {
        includeEmptyRows: true,
      },
    };
  },
  isTransferable: (column, newIndexPattern) => {
    return true; // newIndexPattern.(column.sourceField);
  },
  toEsAggsFn: (column, columnId) => {
    return buildExpressionFunction<AggFunctionsMapping['aggTimeSeries']>('aggTimeSeries', {
      id: columnId,
      enabled: true,
      schema: 'bucket',
    }).toAst();
  },
  paramEditor: () => {
    return <></>;
  },
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.time_series.documentation.quick',
    {
      defaultMessage: `
    Buckets by all time series.
      `,
    }
  ),
};
