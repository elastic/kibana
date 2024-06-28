/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sumBy } from 'lodash';
import type { ESFilter } from '@kbn/es-types';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  METRIC_SYSTEM_CPU_PERCENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { NodeStats } from '../../../common/service_map';
import { defaultTransactionTypes } from '../../../common/transaction_types';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { getBucketSizeForAggregatedTransactions } from '../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import {
  getBackwardCompatibleDocumentTypeFilter,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';
import { getFailedTransactionRate } from '../../lib/transaction_groups/get_failed_transaction_rate';
import { withApmSpan } from '../../utils/with_apm_span';
import { systemMemory, cgroupMemory } from '../metrics/by_agent/shared/memory';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';

interface Options {
  apmEventClient: APMEventClient;
  environment: string;
  serviceName: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  offset?: string;
}

interface TaskParameters {
  environment: string;
  filter: ESFilter[];
  searchAggregatedTransactions: boolean;
  minutes: number;
  serviceName: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  intervalString: string;
  bucketSize: number;
  numBuckets: number;
  offsetInMs: number;
}

function getServiceMapServiceNodeInfoForTimeRange({
  environment,
  serviceName,
  apmEventClient,
  searchAggregatedTransactions,
  start,
  end,
  offset,
}: Options): Promise<NodeStats> {
  return withApmSpan('get_service_map_node_stats', async () => {
    const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
      start,
      end,
      offset,
    });

    const filter: ESFilter[] = [
      { term: { [SERVICE_NAME]: serviceName } },
      ...rangeQuery(startWithOffset, endWithOffset),
      ...environmentQuery(environment),
    ];

    const minutes = (end - start) / 1000 / 60;
    const numBuckets = 20;
    const { intervalString, bucketSize } = getBucketSizeForAggregatedTransactions({
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
      apmEventClient,
      start: startWithOffset,
      end: endWithOffset,
      intervalString,
      bucketSize,
      numBuckets,
      offsetInMs,
    };

    const [failedTransactionsRate, transactionStats, cpuUsage, memoryUsage] = await Promise.all([
      getFailedTransactionsRateStats(taskParams),
      getTransactionStats(taskParams),
      getCpuStats(taskParams),
      getMemoryStats(taskParams),
    ]);
    return {
      failedTransactionsRate,
      transactionStats,
      cpuUsage,
      memoryUsage,
    };
  });
}

async function getFailedTransactionsRateStats({
  apmEventClient,
  serviceName,
  environment,
  searchAggregatedTransactions,
  start,
  end,
  numBuckets,
  offsetInMs,
}: TaskParameters): Promise<NodeStats['failedTransactionsRate']> {
  return withApmSpan('get_error_rate_for_service_map_node', async () => {
    const { average, timeseries } = await getFailedTransactionRate({
      environment,
      apmEventClient,
      serviceName,
      start,
      end,
      kuery: '',
      transactionTypes: defaultTransactionTypes,
      bucketSizeInSeconds: getBucketSizeForAggregatedTransactions({
        start,
        end,
        numBuckets,
        searchAggregatedTransactions,
      }).bucketSize,
      ...(searchAggregatedTransactions
        ? {
            documentType: ApmDocumentType.TransactionMetric,
            rollupInterval: RollupInterval.OneMinute,
          }
        : {
            documentType: ApmDocumentType.TransactionEvent,
            rollupInterval: RollupInterval.None,
          }),
    });
    return {
      value: average,
      timeseries: timeseries.map(({ x, y }) => ({ x: x + offsetInMs, y })),
    };
  });
}

async function getTransactionStats({
  apmEventClient,
  filter,
  minutes,
  searchAggregatedTransactions,
  start,
  end,
  intervalString,
  offsetInMs,
}: TaskParameters): Promise<NodeStats['transactionStats']> {
  const durationField = getDurationFieldForTransactions(searchAggregatedTransactions);

  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...filter,
            ...getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions),
            {
              terms: {
                [TRANSACTION_TYPE]: defaultTransactionTypes,
              },
            },
          ],
        },
      },
      aggs: {
        duration: { avg: { field: durationField } },
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            latency: { avg: { field: durationField } },
          },
        },
      },
    },
  };
  const response = await apmEventClient.search(
    'get_transaction_stats_for_service_map_node',
    params
  );

  const throughputValue = sumBy(response.aggregations?.timeseries.buckets, 'doc_count');

  return {
    latency: {
      value: response.aggregations?.duration.value ?? null,
      timeseries: response.aggregations?.timeseries.buckets.map((bucket) => ({
        x: bucket.key + offsetInMs,
        y: bucket.latency.value,
      })),
    },
    throughput: {
      value: throughputValue ? throughputValue / minutes : null,
      timeseries: response.aggregations?.timeseries.buckets.map((bucket) => {
        return {
          x: bucket.key + offsetInMs,
          y: bucket.doc_count ?? 0,
        };
      }),
    },
  };
}

async function getCpuStats({
  apmEventClient,
  filter,
  intervalString,
  start,
  end,
  offsetInMs,
}: TaskParameters): Promise<NodeStats['cpuUsage']> {
  const response = await apmEventClient.search('get_avg_cpu_usage_for_service_map_node', {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [...filter, { exists: { field: METRIC_SYSTEM_CPU_PERCENT } }],
        },
      },
      aggs: {
        avgCpuUsage: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } },
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            cpuAvg: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } },
          },
        },
      },
    },
  });

  return {
    value: response.aggregations?.avgCpuUsage.value ?? null,
    timeseries: response.aggregations?.timeseries.buckets.map((bucket) => ({
      x: bucket.key + offsetInMs,
      y: bucket.cpuAvg.value,
    })),
  };
}

function getMemoryStats({
  apmEventClient,
  filter,
  intervalString,
  start,
  end,
  offsetInMs,
}: TaskParameters) {
  return withApmSpan('get_memory_stats_for_service_map_node', async () => {
    const getMemoryUsage = async ({
      additionalFilters,
      script,
    }: {
      additionalFilters: ESFilter[];
      script: typeof cgroupMemory.script | typeof systemMemory.script;
    }): Promise<NodeStats['memoryUsage']> => {
      const response = await apmEventClient.search('get_avg_memory_for_service_map_node', {
        apm: {
          events: [ProcessorEvent.metric],
        },
        body: {
          track_total_hits: false,
          size: 0,
          query: {
            bool: {
              filter: [...filter, ...additionalFilters],
            },
          },
          aggs: {
            avgMemoryUsage: { avg: { script } },
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: start, max: end },
              },
              aggs: {
                memoryAvg: { avg: { script } },
              },
            },
          },
        },
      });
      return {
        value: response.aggregations?.avgMemoryUsage.value ?? null,
        timeseries: response.aggregations?.timeseries.buckets.map((bucket) => ({
          x: bucket.key + offsetInMs,
          y: bucket.memoryAvg.value,
        })),
      };
    };

    let memoryUsage = await getMemoryUsage({
      script: cgroupMemory.script,
      additionalFilters: [cgroupMemory.filter],
    });

    if (!memoryUsage) {
      memoryUsage = await getMemoryUsage({
        script: systemMemory.script,
        additionalFilters: [systemMemory.filter],
      });
    }

    return memoryUsage;
  });
}

export interface ServiceMapServiceNodeInfoResponse {
  currentPeriod: NodeStats;
  previousPeriod: NodeStats | undefined;
}

export async function getServiceMapServiceNodeInfo({
  environment,
  apmEventClient,
  serviceName,
  searchAggregatedTransactions,
  start,
  end,
  offset,
}: Options): Promise<ServiceMapServiceNodeInfoResponse> {
  const commonProps = {
    environment,
    apmEventClient,
    serviceName,
    searchAggregatedTransactions,
    start,
    end,
  };

  const [currentPeriod, previousPeriod] = await Promise.all([
    getServiceMapServiceNodeInfoForTimeRange(commonProps),
    offset ? getServiceMapServiceNodeInfoForTimeRange({ ...commonProps, offset }) : undefined,
  ]);

  return { currentPeriod, previousPeriod };
}
