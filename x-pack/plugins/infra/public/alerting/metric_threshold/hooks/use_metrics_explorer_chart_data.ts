/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';
import { useMemo } from 'react';
import { InfraSource } from '../../../../common/http_api/source_api';
import { AlertContextMeta, MetricExpression } from '../types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertsContextValue } from '../../../../../triggers_actions_ui/public/application/context/alerts_context';
import { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { useMetricsExplorerData } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_data';

export const useMetricsExplorerChartData = (
  expression: MetricExpression,
  context: AlertsContextValue<AlertContextMeta>,
  derivedIndexPattern: IIndexPattern,
  source: InfraSource | null,
  filterQuery?: string,
  groupBy?: string
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
    null,
    context.http.fetch
  );
};
