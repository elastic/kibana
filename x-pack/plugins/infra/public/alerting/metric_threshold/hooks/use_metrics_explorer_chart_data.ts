/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';
import { useMemo } from 'react';
import { first } from 'lodash';
import { InfraSource } from '../../../../common/http_api/source_api';
import { MetricThresholdAlertParams, AlertContextMeta } from '../types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertsContextValue } from '../../../../../triggers_actions_ui/public/application/context/alerts_context';
import { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { useMetricsExplorerData } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_data';

export const useMetricsExplorerChartData = (
  params: MetricThresholdAlertParams,
  context: AlertsContextValue<AlertContextMeta>,
  derivedIndexPattern: IIndexPattern,
  source: InfraSource | null
) => {
  const firstCriteria = first(params.criteria || []);
  const { timeSize, timeUnit } = firstCriteria || { timeSize: 1, timeUnit: 'm' };
  const options: MetricsExplorerOptions = useMemo(
    () => ({
      limit: 1,
      forceInterval: true,
      groupBy: params.groupBy,
      filterQuery: params.filterQuery,
      metrics:
        params.criteria?.map(criteria => ({
          field: criteria.metric,
          aggregation: criteria.aggType,
        })) || [],
      aggregation: params.criteria?.[0].aggType || 'avg',
    }),
    [params]
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
