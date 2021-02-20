/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../../typings/elasticsearch';
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
import { environmentQuery, rangeQuery } from '../../../common/utils/queries';
import { withApmSpan } from '../../utils/with_apm_span';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  percentCgroupMemoryUsedScript,
  percentSystemMemoryUsedScript,
} from '../metrics/by_agent/shared/memory';
import { getErrorRate } from '../transaction_groups/get_error_rate';

interface Options {
  setup: Setup & SetupTimeRange;
  environment?: string;
  serviceName: string;
  searchAggregatedTransactions: boolean;
}

interface TaskParameters {
  environment?: string;
  filter: ESFilter[];
  searchAggregatedTransactions: boolean;
  minutes: number;
  serviceName?: string;
  setup: Setup;
}

export function getServiceMapServiceNodeInfo({
  environment,
  serviceName,
  setup,
  searchAggregatedTransactions,
}: Options & { serviceName: string }) {
  return withApmSpan('get_service_map_node_stats', async () => {
    const { start, end, uiFilters } = setup;

    const filter: ESFilter[] = [
      { term: { [SERVICE_NAME]: serviceName } },
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
    ];

    const minutes = Math.abs((end - start) / (1000 * 60));
    const taskParams = {
      environment: uiFilters.environment,
      filter,
      searchAggregatedTransactions,
      minutes,
      serviceName,
      setup,
    };

    const [
      errorStats,
      transactionStats,
      cpuStats,
      memoryStats,
    ] = await Promise.all([
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
}: {
  setup: Options['setup'];
  serviceName: string;
  environment?: string;
  searchAggregatedTransactions: boolean;
}) {
  return withApmSpan('get_error_rate_for_service_map_node', async () => {
    const { noHits, average } = await getErrorRate({
      environment,
      setup,
      serviceName,
      searchAggregatedTransactions,
    });

    return { avgErrorRate: noHits ? null : average };
  });
}

function getTransactionStats({
  setup,
  filter,
  minutes,
  searchAggregatedTransactions,
}: TaskParameters): Promise<{
  avgTransactionDuration: number | null;
  avgRequestsPerMinute: number | null;
}> {
  return withApmSpan('get_transaction_stats_for_service_map_node', async () => {
    const { apmEventClient } = setup;

    const params = {
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...filter,
              ...getDocumentTypeFilterForAggregatedTransactions(
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
          duration: {
            avg: {
              field: getTransactionDurationFieldForAggregatedTransactions(
                searchAggregatedTransactions
              ),
            },
          },
        },
      },
    };
    const response = await apmEventClient.search(params);

    const totalRequests = response.hits.total.value;

    return {
      avgTransactionDuration: response.aggregations?.duration.value ?? null,
      avgRequestsPerMinute: totalRequests > 0 ? totalRequests / minutes : null,
    };
  });
}

function getCpuStats({
  setup,
  filter,
}: TaskParameters): Promise<{ avgCpuUsage: number | null }> {
  return withApmSpan('get_avg_cpu_usage_for_service_map_node', async () => {
    const { apmEventClient } = setup;

    const response = await apmEventClient.search({
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
    });

    return { avgCpuUsage: response.aggregations?.avgCpuUsage.value ?? null };
  });
}

function getMemoryStats({
  setup,
  filter,
}: TaskParameters): Promise<{ avgMemoryUsage: number | null }> {
  return withApmSpan('get_memory_stats_for_service_map_node', async () => {
    const { apmEventClient } = setup;

    const getAvgMemoryUsage = ({
      additionalFilters,
      script,
    }: {
      additionalFilters: ESFilter[];
      script: typeof percentCgroupMemoryUsedScript;
    }) => {
      return withApmSpan('get_avg_memory_for_service_map_node', async () => {
        const response = await apmEventClient.search({
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
        });
        return response.aggregations?.avgMemoryUsage.value ?? null;
      });
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
