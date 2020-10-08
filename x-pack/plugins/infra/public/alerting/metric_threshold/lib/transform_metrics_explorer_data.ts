/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'lodash';
import { MetricsExplorerResponse } from '../../../../common/http_api/metrics_explorer';
import { MetricThresholdAlertParams, ExpressionChartSeries } from '../types';

export const transformMetricsExplorerData = (
  params: MetricThresholdAlertParams,
  data: MetricsExplorerResponse | null
) => {
  const { criteria } = params;
  const firstSeries = first(data?.series);
  if (criteria && firstSeries) {
    const series = firstSeries.rows.reduce((acc, row) => {
      const { timestamp } = row;
      criteria.forEach((item, index) => {
        if (!acc[index]) {
          acc[index] = [];
        }
        const value = (row[`metric_${index}`] as number) || 0;
        acc[index].push({ timestamp, value });
      });
      return acc;
    }, [] as ExpressionChartSeries);
    return { id: firstSeries.id, series };
  }
};
