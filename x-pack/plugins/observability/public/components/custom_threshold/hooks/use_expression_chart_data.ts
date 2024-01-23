/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DateMath from '@kbn/datemath';
import { DataViewBase } from '@kbn/es-query';
import { useMemo } from 'react';
import {
  Aggregators,
  AggType,
  CustomThresholdExpressionMetric,
} from '../../../../common/custom_threshold_rule/types';
import {
  ExpressionOptions,
  ExpressionTimestampsRT,
  MetricExpression,
  MetricsExplorerMetricRT,
  TimeRange,
} from '../types';
import { useExpressionData } from './use_expression_data';

const DEFAULT_TIME_RANGE = {};
const DEFAULT_TIMESTAMP = '@timestamp';

export const useExpressionChartData = (
  expression: MetricExpression,
  derivedIndexPattern: DataViewBase,
  filterQuery?: string,
  groupBy?: string | string[],
  timeRange: TimeRange = DEFAULT_TIME_RANGE,
  timeFieldName: string = DEFAULT_TIMESTAMP
) => {
  const { timeSize, timeUnit } = expression || { timeSize: 1, timeUnit: 'm' };

  const options: ExpressionOptions = useMemo(
    () => ({
      limit: 1,
      forceInterval: true,
      dropLastBucket: false,
      groupBy,
      filterQuery,
      metrics: [
        {
          aggregation: 'custom',
          // Infra API expects this field to be custom_metrics
          // since the same field is used in the metric threshold rule
          custom_metrics:
            expression?.metrics?.map(mapCustomThresholdMetricToMetricsExplorerMetric) ?? [],
          equation: expression.equation,
        },
      ],
      aggregation: 'custom',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      expression.equation,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(expression.metrics),
      filterQuery,
      groupBy,
    ]
  );
  const timestamps: ExpressionTimestampsRT = useMemo(() => {
    const from = timeRange.from ?? `now-${(timeSize || 1) * 20}${timeUnit}`;
    const to = timeRange.to ?? 'now';
    const fromTimestamp = DateMath.parse(from)!.valueOf();
    const toTimestamp = DateMath.parse(to, { roundUp: true })!.valueOf();
    return {
      interval: `>=${timeSize || 1}${timeUnit}`,
      fromTimestamp,
      toTimestamp,
      timeFieldName,
    };
  }, [timeRange.from, timeRange.to, timeSize, timeUnit, timeFieldName]);

  return useExpressionData(options, derivedIndexPattern, timestamps);
};

const mapCustomThresholdMetricToMetricsExplorerMetric = (
  metric: CustomThresholdExpressionMetric
): MetricsExplorerMetricRT => {
  if (metric.aggType === 'count') {
    return {
      name: metric.name,
      aggregation: Aggregators.COUNT,
      filter: metric.filter,
    };
  }

  return {
    name: metric.name,
    aggregation: metric.aggType as AggType,
    field: metric.field,
  };
};
