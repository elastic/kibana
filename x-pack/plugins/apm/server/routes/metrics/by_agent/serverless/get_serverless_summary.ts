/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ESFilter } from '@kbn/es-types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  FAAS_BILLED_DURATION,
  FAAS_DURATION,
  SERVICE_NAME,
  FAAS_NAME,
  METRIC_CGROUP_MEMORY_USAGE_BYTES,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
} from '../../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { Setup } from '../../../../lib/helpers/setup_request';
import {
  percentCgroupMemoryUsedScript,
  percentSystemMemoryUsedScript,
} from '../shared/memory';

export async function getServerlessSummary({
  end,
  environment,
  kuery,
  serviceName,
  setup,
  start,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const filters = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: 1,
      size: 0,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        totalFunctions: { cardinality: { field: FAAS_NAME } },
        faasDurationAvg: { avg: { field: FAAS_DURATION } },
        faasBilledDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
        avgTotalMemory: { avg: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
      },
    },
  };

  const response = await apmEventClient.search(
    'ger_serverless_summary',
    params
  );

  async function getMemoryUsage({
    additionalFilters,
    script,
  }: {
    additionalFilters: ESFilter[];
    script:
      | typeof percentCgroupMemoryUsedScript
      | typeof percentSystemMemoryUsedScript;
  }) {
    const memoryUsageResponse = await apmEventClient.search(
      'get_avg_memory_for_service_map_node',
      {
        apm: { events: [ProcessorEvent.metric] },
        body: {
          track_total_hits: false,
          size: 0,
          query: {
            bool: { filter: [...filters, ...additionalFilters] },
          },
          aggs: { avgMemoryUsage: { avg: { script } } },
        },
      }
    );
    return memoryUsageResponse.aggregations?.avgMemoryUsage.value ?? null;
  }

  let memoryUsage = await getMemoryUsage({
    additionalFilters: [
      { exists: { field: METRIC_CGROUP_MEMORY_USAGE_BYTES } },
    ],
    script: percentCgroupMemoryUsedScript,
  });

  if (!memoryUsage) {
    memoryUsage = await getMemoryUsage({
      additionalFilters: [
        { exists: { field: METRIC_SYSTEM_FREE_MEMORY } },
        { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
      ],
      script: percentSystemMemoryUsedScript,
    });
  }

  return {
    memoryUsageAvg: memoryUsage,
    serverlessFunctionsTotal: response.aggregations?.totalFunctions.value,
    serverlessDurationAvg: response.aggregations?.faasDurationAvg.value,
    billedDurationAvg: response.aggregations?.faasBilledDurationAvg.value,
  };
}
