/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { rangeFilter } from '../../../common/utils/range_filter';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getEnvironmentUiFilterES } from '../helpers/convert_ui_filters/get_environment_ui_filter_es';
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

export async function getServiceMapServiceNodeInfo({
  serviceName,
  setup,
  searchAggregatedTransactions,
}: Options & { serviceName: string }) {
  const { start, end, uiFilters } = setup;

  const filter: ESFilter[] = [
    { range: rangeFilter(start, end) },
    { term: { [SERVICE_NAME]: serviceName } },
    ...getEnvironmentUiFilterES(uiFilters.environment),
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
  const setupWithBlankUiFilters = {
    ...setup,
    uiFilters: { environment },
    esFilter: getEnvironmentUiFilterES(environment),
  };
  const { noHits, average } = await getErrorRate({
    setup: setupWithBlankUiFilters,
    serviceName,
    searchAggregatedTransactions,
  });
  return { avgErrorRate: noHits ? null : average };
}

async function getTransactionStats({
  setup,
  filter,
  minutes,
  searchAggregatedTransactions,
}: TaskParameters): Promise<{
  avgTransactionDuration: number | null;
  avgRequestsPerMinute: number | null;
}> {
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
        count: {
          value_count: {
            field: getTransactionDurationFieldForAggregatedTransactions(
              searchAggregatedTransactions
            ),
          },
        },
      },
    },
  };
  const response = await apmEventClient.search(params);

  const totalRequests = response.aggregations?.count.value ?? 0;

  return {
    avgTransactionDuration: response.aggregations?.duration.value ?? null,
    avgRequestsPerMinute: totalRequests > 0 ? totalRequests / minutes : null,
  };
}

async function getCpuStats({
  setup,
  filter,
}: TaskParameters): Promise<{ avgCpuUsage: number | null }> {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...filter, { exists: { field: METRIC_SYSTEM_CPU_PERCENT } }],
        },
      },
      aggs: { avgCpuUsage: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } } },
    },
  });

  return { avgCpuUsage: response.aggregations?.avgCpuUsage.value ?? null };
}

async function getMemoryStats({
  setup,
  filter,
}: TaskParameters): Promise<{ avgMemoryUsage: number | null }> {
  const { apmEventClient } = setup;

  const getAvgMemoryUsage = async ({
    additionalFilters,
    script,
  }: {
    additionalFilters: ESFilter[];
    script: typeof percentCgroupMemoryUsedScript;
  }) => {
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
}
