/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  termQuery,
  kqlQuery,
  rangeQuery,
} from '@kbn/observability-plugin/server';
import {
  FAAS_BILLED_DURATION,
  FAAS_DURATION,
  FAAS_ID,
  METRICSET_NAME,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { Setup } from '../../../lib/helpers/setup_request';
import { calcMemoryUsedRate } from './helper';

export async function getServerlessSummary({
  end,
  environment,
  kuery,
  serviceName,
  setup,
  start,
  serverlessId,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  start: number;
  end: number;
  serverlessId?: string;
}) {
  const { apmEventClient } = setup;

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
            ...termQuery(METRICSET_NAME, 'app'),
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(FAAS_ID, serverlessId),
          ],
        },
      },
      aggs: {
        totalFunctions: { cardinality: { field: FAAS_ID } },
        faasDurationAvg: { avg: { field: FAAS_DURATION } },
        faasBilledDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
        avgTotalMemory: { avg: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
        avgFreeMemory: { avg: { field: METRIC_SYSTEM_FREE_MEMORY } },
      },
    },
  };

  const response = await apmEventClient.search(
    'ger_serverless_summary',
    params
  );

  return {
    memoryUsageAvgRate: calcMemoryUsedRate({
      memoryFree: response.aggregations?.avgFreeMemory?.value,
      memoryTotal: response.aggregations?.avgTotalMemory?.value,
    }),
    serverlessFunctionsTotal: response.aggregations?.totalFunctions?.value,
    serverlessDurationAvg: response.aggregations?.faasDurationAvg?.value,
    billedDurationAvg: response.aggregations?.faasBilledDurationAvg?.value,
  };
}
