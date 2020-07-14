/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRANSACTION_TYPE,
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
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { percentMemoryUsedScript } from '../metrics/by_agent/shared/memory';
import {
  TRANSACTION_REQUEST,
  TRANSACTION_PAGE_LOAD,
} from '../../../common/transaction_types';
import { getEnvironmentUiFilterES } from '../helpers/convert_ui_filters/get_environment_ui_filter_es';

interface Options {
  setup: Setup & SetupTimeRange;
  environment?: string;
  serviceName: string;
}

interface TaskParameters {
  environment?: string;
  filter: ESFilter[];
  minutes: number;
  serviceName?: string;
  setup: Setup;
}

export async function getServiceMapServiceNodeInfo({
  serviceName,
  environment,
  setup,
}: Options & { serviceName: string; environment?: string }) {
  const { start, end } = setup;

  const filter: ESFilter[] = [
    { range: rangeFilter(start, end) },
    { term: { [SERVICE_NAME]: serviceName } },
  ];

  // The environment parameter given to this endpoint is not the same as the
  // environment in the uiFilters (this endpoint doesn't take uiFilters as a
  // parameter) but the evnironment of the selected node. We use the same function
  // used by `getUiFiltersES` to create the filter used for environment.
  const environmentFilter = getEnvironmentUiFilterES(environment);

  if (environmentFilter) {
    filter.push(environmentFilter);
  }

  const minutes = Math.abs((end - start) / (1000 * 60));
  const taskParams = {
    environment,
    filter,
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
  environment,
  filter,
  serviceName,
  setup,
}: {
  environment?: string;
  filter: ESFilter[];
  serviceName: string;
  setup: Options['setup'];
}) {
  // The endpoint that calls `getServiceMapServiceNodeInfo` does not take
  // `uiFilters` but other endpoints that call getErrorRate do, so we pass in an
  // a setup object with an empty list of uiFilters added to satisfy the type
  // definition of `getErrorRate`
  const setupWithBlankUiFilters = { ...setup, uiFiltersES: [] };

  const { average, noHits } = await getErrorRate({
    environment,
    serviceName,
    setup: setupWithBlankUiFilters,
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

  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...filter,
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
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
      aggs: { duration: { avg: { field: TRANSACTION_DURATION } } },
    },
  };
  const response = await client.search(params);
  const docCount = response.hits.total.value;
  return {
    avgTransactionDuration: response.aggregations?.duration.value ?? null,
    avgRequestsPerMinute: docCount > 0 ? docCount / minutes : null,
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
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.metric } },
            { exists: { field: METRIC_SYSTEM_CPU_PERCENT } },
          ]),
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
  const { client, indices } = setup;
  const response = await client.search({
    index: indices['apm_oss.metricsIndices'],
    body: {
      query: {
        bool: {
          filter: filter.concat([
            { term: { [PROCESSOR_EVENT]: 'metric' } },
            { exists: { field: METRIC_SYSTEM_FREE_MEMORY } },
            { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
          ]),
        },
      },
      aggs: { avgMemoryUsage: { avg: { script: percentMemoryUsedScript } } },
    },
  });

  return {
    avgMemoryUsage: response.aggregations?.avgMemoryUsage.value ?? null,
  };
}
