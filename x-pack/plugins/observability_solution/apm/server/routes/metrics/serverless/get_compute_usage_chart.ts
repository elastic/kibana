/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { APMConfig } from '../../..';
import {
  FAAS_BILLED_DURATION,
  FAAS_ID,
  METRICSET_NAME,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getMetricsDateHistogramParams } from '../../../lib/helpers/metrics';
import { GenericMetricsChart } from '../fetch_and_transform_metrics';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { convertComputeUsageToGbSec } from './helper';

export const computeUsageAvgScript = {
  avg: {
    script: `return $('${METRIC_SYSTEM_TOTAL_MEMORY}', 0) * $('${FAAS_BILLED_DURATION}', 0)`,
  },
};

export async function getComputeUsageChart({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  start,
  end,
  serverlessId,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  start: number;
  end: number;
  serverlessId?: string;
}): Promise<GenericMetricsChart> {
  const aggs = {
    countInvocations: { value_count: { field: FAAS_BILLED_DURATION } },
    avgComputeUsageBytesMs: computeUsageAvgScript,
  };

  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            { exists: { field: FAAS_BILLED_DURATION } },
            ...termQuery(METRICSET_NAME, 'app'),
            ...termQuery(FAAS_ID, serverlessId),
          ],
        },
      },
      aggs: {
        timeseriesData: {
          date_histogram: getMetricsDateHistogramParams({
            start,
            end,
            metricsInterval: config.metricsInterval,
          }),
          aggs,
        },
        ...aggs,
      },
    },
  };

  const { aggregations } = await apmEventClient.search('get_compute_usage', params);
  const timeseriesData = aggregations?.timeseriesData;

  return {
    title: i18n.translate('xpack.apm.agentMetrics.serverless.computeUsage', {
      defaultMessage: 'Compute usage',
    }),
    key: 'compute_usage',
    yUnit: 'number',
    description: i18n.translate('xpack.apm.agentMetrics.serverless.computeUsage.description', {
      defaultMessage:
        "Compute usage (in GB-seconds) is the execution time multiplied by the available memory size of your function's instances. The compute usage is a direct indicator for the costs of your serverless function.",
    }),
    series:
      !timeseriesData || timeseriesData.buckets.length === 0
        ? []
        : [
            {
              title: i18n.translate('xpack.apm.agentMetrics.serverless.computeUsage', {
                defaultMessage: 'Compute usage',
              }),
              key: 'compute_usage',
              type: 'bar',
              overallValue:
                convertComputeUsageToGbSec({
                  computeUsageBytesMs: aggregations?.avgComputeUsageBytesMs.value,
                  countInvocations: aggregations?.countInvocations.value,
                }) ?? 0,
              color: theme.euiColorVis0,
              data: timeseriesData.buckets.map((bucket) => {
                const computeUsage =
                  convertComputeUsageToGbSec({
                    computeUsageBytesMs: bucket.avgComputeUsageBytesMs.value,
                    countInvocations: bucket.countInvocations.value,
                  }) ?? 0;
                return {
                  x: bucket.key,
                  y: computeUsage,
                };
              }),
            },
          ],
  };
}
