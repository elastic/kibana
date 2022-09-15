/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import { euiLightVars as theme } from '@kbn/ui-theme';
import {
  FAAS_BILLED_DURATION,
  METRICSET_NAME,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { isFiniteNumber } from '../../../../../common/utils/is_finite_number';
import { getVizColorForIndex } from '../../../../../common/viz_colors';
import { getMetricsDateHistogramParams } from '../../../../lib/helpers/metrics';
import { Setup } from '../../../../lib/helpers/setup_request';
import { GenericMetricsChart } from '../../fetch_and_transform_metrics';
import { ChartBase } from '../../types';

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.serverless.computeUsage', {
    defaultMessage: 'Compute usage',
  }),
  key: 'compute_usage',
  type: 'linemark',
  yUnit: 'number',
  series: {
    computeUsage: {
      title: i18n.translate('xpack.apm.agentMetrics.serverless.computeUsage', {
        defaultMessage: 'Compute usage',
      }),
    },
  },
};

/**
 * To calculate the compute usage we need to multiply the "system.memory.total" by "faas.billed_duration".
 * But the result of this calculation is in Bytes-milliseconds, as the "system.memory.total" is stored in bytes and the "faas.billed_duration" is stored in milliseconds.
 * But to calculate the overall cost AWS uses GB-second, so we need to convert the result to this unit.
 */
const GB = 1024 ** 3;
function calculateComputeUsageGBSeconds({
  faasBilledDuration,
  totalMemory,
}: {
  faasBilledDuration?: number | null;
  totalMemory?: number | null;
}) {
  if (!isFiniteNumber(faasBilledDuration) || !isFiniteNumber(totalMemory)) {
    return 0;
  }

  const totalMemoryGB = totalMemory / GB;
  const faasBilledDurationSec = faasBilledDuration / 1000;
  return totalMemoryGB * faasBilledDurationSec;
}

export async function getComputeUsage({
  environment,
  kuery,
  setup,
  serviceName,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  start: number;
  end: number;
}): Promise<GenericMetricsChart> {
  const { apmEventClient, config } = setup;

  const aggs = {
    avgFaasBilledDuration: { avg: { field: FAAS_BILLED_DURATION } },
    avgTotalMemory: { avg: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
  };

  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
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

  const { aggregations } = await apmEventClient.search(
    'get_compute_usage',
    params
  );
  const timeseriesData = aggregations?.timeseriesData;

  return {
    title: chartBase.title,
    key: chartBase.key,
    yUnit: chartBase.yUnit,
    series:
      !timeseriesData || timeseriesData.buckets.length === 0
        ? []
        : [
            {
              title: i18n.translate(
                'xpack.apm.agentMetrics.serverless.computeUsage',
                { defaultMessage: 'Compute usage' }
              ),
              key: 'compute_usage',
              type: 'linemark',
              overallValue: calculateComputeUsageGBSeconds({
                faasBilledDuration: aggregations?.avgFaasBilledDuration.value,
                totalMemory: aggregations?.avgTotalMemory.value,
              }),
              color: getVizColorForIndex(0, theme),
              data: timeseriesData.buckets.map((bucket) => {
                const computeUsage = calculateComputeUsageGBSeconds({
                  faasBilledDuration: bucket.avgFaasBilledDuration.value,
                  totalMemory: bucket.avgTotalMemory.value,
                });
                return {
                  x: bucket.key,
                  y: computeUsage,
                };
              }),
            },
          ],
  };
}
