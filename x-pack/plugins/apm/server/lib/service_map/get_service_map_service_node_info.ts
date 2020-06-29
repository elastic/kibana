/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  METRIC_SYSTEM_CPU_PERCENT,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeFilter } from '../../../common/utils/range_filter';
import { ESFilter } from '../../../typings/elasticsearch';
import { getErrorRate } from '../errors/get_error_rate';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { percentMemoryUsedScript } from '../metrics/by_agent/shared/memory';

interface Options {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName: string;
}

interface TaskParameters {
  serviceName?: string;
  setup: Setup;
  minutes: number;
  filter: ESFilter[];
}

export async function getServiceMapServiceNodeInfo({
  serviceName,
  setup,
}: Options) {
  const { start, end, uiFiltersES } = setup;

  const filter: ESFilter[] = [
    { range: rangeFilter(start, end) },
    { term: { [SERVICE_NAME]: serviceName } },
    ...uiFiltersES,
  ];

  const minutes = Math.abs((end - start) / (1000 * 60));

  const taskParams = {
    serviceName,
    setup,
    minutes,
    filter,
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
    ...transactionStats,
    ...cpuStats,
    ...memoryStats,
  };
}

async function getErrorStats({
  filter,
  serviceName,
  setup,
}: {
  filter: ESFilter[];
  serviceName: string;
  setup: Options['setup'];
}) {
  const { average, noHits } = await getErrorRate({
    serviceName,
    setup: {
      ...setup,
      uiFiltersES: filter,
    },
  });

  return { avgErrorRate: noHits ? null : average };
}

async function getTransactionStats({
  setup,
  filter,
  minutes,
}: TaskParameters): Promise<{
  avgTransactionDuration: number | null;
  avgRequestsPerMinute: number | null;
}> {
  const { indices, client } = setup;

  const response = await client.search({
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 1,
      query: {
        bool: {
          filter: filter.concat({
            term: {
              [PROCESSOR_EVENT]: ProcessorEvent.transaction,
            },
          }),
        },
      },
      track_total_hits: true,
      aggs: {
        duration: {
          avg: {
            field: TRANSACTION_DURATION,
          },
        },
      },
    },
  });

  return {
    avgTransactionDuration: response.aggregations?.duration.value ?? null,
    avgRequestsPerMinute:
      response.hits.total.value > 0
        ? response.hits.total.value / minutes
        : null,
  };
}

async function getCpuStats({
  setup,
  filter,
}: TaskParameters): Promise<{ avgCpuUsage: number | null }> {
  const { indices, client } = setup;

  const response = await client.search({
    index: indices['apm_oss.metricsIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: filter.concat([
            {
              term: {
                [PROCESSOR_EVENT]: ProcessorEvent.metric,
              },
            },
            {
              exists: {
                field: METRIC_SYSTEM_CPU_PERCENT,
              },
            },
          ]),
        },
      },
      aggs: {
        avgCpuUsage: {
          avg: {
            field: METRIC_SYSTEM_CPU_PERCENT,
          },
        },
      },
    },
  });

  return {
    avgCpuUsage: response.aggregations?.avgCpuUsage.value ?? null,
  };
}

async function getMemoryStats({
  setup,
  filter,
}: TaskParameters): Promise<{ avgMemoryUsage: number | null }> {
  const { client, indices } = setup;
  const response = await client.search({
    index: indices['apm_oss.metricsIndices'],
    body: {
      query: {
        bool: {
          filter: filter.concat([
            {
              term: {
                [PROCESSOR_EVENT]: ProcessorEvent.metric,
              },
            },
            {
              exists: {
                field: METRIC_SYSTEM_FREE_MEMORY,
              },
            },
            {
              exists: {
                field: METRIC_SYSTEM_TOTAL_MEMORY,
              },
            },
          ]),
        },
      },
      aggs: {
        avgMemoryUsage: {
          avg: {
            script: percentMemoryUsedScript,
          },
        },
      },
    },
  });

  return {
    avgMemoryUsage: response.aggregations?.avgMemoryUsage.value ?? null,
  };
}
