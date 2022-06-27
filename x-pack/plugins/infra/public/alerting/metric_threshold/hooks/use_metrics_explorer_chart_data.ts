/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';
import { useMemo } from 'react';
import { MetricsSourceConfiguration } from '../../../../common/metrics_sources';
import { MetricExpression } from '../types';
import { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { useMetricsExplorerData } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_data';

export const useMetricsExplorerChartData = (
  expression: MetricExpression,
  derivedIndexPattern: DataViewBase,
  source: MetricsSourceConfiguration | null,
  filterQuery?: string,
  groupBy?: string | string[]
) => {
  const { timeSize, timeUnit } = expression || { timeSize: 1, timeUnit: 'm' };
  const options: MetricsExplorerOptions = useMemo(
    () => ({
      limit: 1,
      forceInterval: true,
      dropLastBucket: false,
      groupBy,
      filterQuery,
      metrics: [
        {
          field: expression.metric,
          aggregation: expression.aggType,
        },
      ],
      aggregation: expression.aggType || 'avg',
    }),
    [expression.aggType, expression.metric, filterQuery, groupBy]
  );
  const timerange = useMemo(
    () => ({
      interval: `>=${timeSize || 1}${timeUnit}`,
      from: `now-${(timeSize || 1) * 20}${timeUnit}`,
      to: 'now',
    }),
    [timeSize, timeUnit]
  );

  return useMetricsExplorerData(
    options,
    source?.configuration,
    derivedIndexPattern,
    timerange,
    null,
    null
  );
};
