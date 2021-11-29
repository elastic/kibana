/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../../../src/core/types/elasticsearch';
import { rangeQuery } from '../../../../observability/server';
import {
  METRIC_CGROUP_MEMORY_USAGE_BYTES,
  METRIC_SYSTEM_CPU_PERCENT,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Coordinate } from '../../../typings/timeseries';
import { getBucketSizeForAggregatedTransactions } from '../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import { Setup } from '../../lib/helpers/setup_request';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
  getTransactionDurationFieldForTransactions,
} from '../../lib/helpers/transactions';
import { getErrorRate } from '../../lib/transaction_groups/get_error_rate';
import { withApmSpan } from '../../utils/with_apm_span';
import {
  percentCgroupMemoryUsedScript,
  percentSystemMemoryUsedScript,
} from '../metrics/by_agent/shared/memory';

interface Options {
  setup: Setup;
  environment: string;
  serviceName: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}

interface TaskParameters {
  environment: string;
  filter: ESFilter[];
  searchAggregatedTransactions: boolean;
  minutes: number;
  serviceName: string;
  setup: Setup;
  start: number;
  end: number;
  intervalString: string;
  numBuckets: number;
}

export function getServiceMapServiceNodeInfo({
  environment,
  serviceName,
  setup,
  searchAggregatedTransactions,
  start,
  end,
}: Options) {
  return withApmSpan('get_service_map_node_stats', async () => {
    const filter: ESFilter[] = [
      { term: { [SERVICE_NAME]: serviceName } },
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
    ];

    const minutes = Math.abs((end - start) / (1000 * 60));
    const numBuckets = 20;
    const { intervalString } = getBucketSizeForAggregatedTransactions({
      start,
      end,
      searchAggregatedTransactions,
      numBuckets,
    });
    const taskParams = {
      environment,
      filter,
      searchAggregatedTransactions,
      minutes,
      serviceName,
      setup,
      start,
      end,
      intervalString,
      numBuckets,
    };

    const [errorStats, transactionStats, cpuStats, memoryStats] =
      await Promise.all([
        getErrorStats(taskParams),
        getTransactionStats(taskParams),
        getCpuStats(taskParams),
        getMemoryStats(taskParams),
      ]);
    return {
      ...errorStats,
      transactionStats,
      ...cpuStats,
      ...memoryStats,
    };
  });
}

async function getErrorStats({
  setup,
  serviceName,
  environment,
  searchAggregatedTransactions,
  start,
  end,
  numBuckets,
}: TaskParameters) {
  return withApmSpan('get_error_rate_for_service_map_node', async () => {
    const { average, timeseries: errorRateTimeseries } = await getErrorRate({
      environment,
      setup,
      serviceName,
      searchAggregatedTransactions,
      start,
      end,
      kuery: '',
      numBuckets,
    });
    return { avgErrorRate: average, errorRateTimeseries };
  });
}

async function getTransactionStats({
  setup,
  filter,
  minutes,
  searchAggregatedTransactions,
  start,
  end,
  intervalString,
}: TaskParameters): Promise<{
  avgTransactionDuration: number | null;
  avgRequestsPerMinute: number | null;
  latencyTimeseries?: Coordinate[];
}> {
  const { apmEventClient } = setup;

  const field = getTransactionDurationFieldForTransactions(
    searchAggregatedTransactions
  );

  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...filter,
            ...getDocumentTypeFilterForTransactions(
              searchAggregatedTransactions
            ),
            {
              terms: {
                [TRANSACTION_TYPE]: [
                  TRANSACTION_REQUEST,
                  TRANSACTION_PAGE_LOAD,
                ],
              },
            },
          ],
        },
      },
      track_total_hits: true,
      aggs: {
        duration: { avg: { field } },
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            latency: { avg: { field } },
          },
        },
      },
    },
  };
  const response = await apmEventClient.search(
    'get_transaction_stats_for_service_map_node',
    params
  );

  const totalRequests = response.hits.total.value;

  return {
    avgTransactionDuration: response.aggregations?.duration.value ?? null,
    avgRequestsPerMinute: totalRequests > 0 ? totalRequests / minutes : null,
    latencyTimeseries: response.aggregations?.timeseries.buckets.map(
      (bucket) => {
        return {
          x: bucket.key,
          y: bucket.latency.value,
        };
      }
    ),
  };
}

async function getCpuStats({
  setup,
  filter,
}: TaskParameters): Promise<{ avgCpuUsage: number | null }> {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search(
    'get_avg_cpu_usage_for_service_map_node',
    {
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...filter,
              { exists: { field: METRIC_SYSTEM_CPU_PERCENT } },
            ],
          },
        },
        aggs: { avgCpuUsage: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } } },
      },
    }
  );

  return { avgCpuUsage: response.aggregations?.avgCpuUsage.value ?? null };
}

function getMemoryStats({
  setup,
  filter,
}: TaskParameters): Promise<{ avgMemoryUsage: number | null }> {
  return withApmSpan('get_memory_stats_for_service_map_node', async () => {
    const { apmEventClient } = setup;

    const getAvgMemoryUsage = async ({
      additionalFilters,
      script,
    }: {
      additionalFilters: ESFilter[];
      script:
        | typeof percentCgroupMemoryUsedScript
        | typeof percentSystemMemoryUsedScript;
    }) => {
      const response = await apmEventClient.search(
        'get_avg_memory_for_service_map_node',
        {
          apm: {
            events: [ProcessorEvent.metric],
          },
          body: {
            size: 0,
            query: {
              bool: {
                filter: [...filter, ...additionalFilters],
              },
            },
            aggs: {
              avgMemoryUsage: { avg: { script } },
            },
          },
        }
      );
      return response.aggregations?.avgMemoryUsage.value ?? null;
    };

    let avgMemoryUsage = await getAvgMemoryUsage({
      additionalFilters: [
        { exists: { field: METRIC_CGROUP_MEMORY_USAGE_BYTES } },
      ],
      script: percentCgroupMemoryUsedScript,
    });

    if (!avgMemoryUsage) {
      avgMemoryUsage = await getAvgMemoryUsage({
        additionalFilters: [
          { exists: { field: METRIC_SYSTEM_FREE_MEMORY } },
          { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
        ],
        script: percentSystemMemoryUsedScript,
      });
    }

    return { avgMemoryUsage };
  });
}
