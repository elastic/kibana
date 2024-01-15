/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import { Coordinate } from '../../../../typings/timeseries';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  getBackwardCompatibleDocumentTypeFilter,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { getBucketSizeForAggregatedTransactions } from '../../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../../lib/helpers/latency_aggregation_type';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { InstancesSortField } from '../../../../common/instances';

interface ServiceInstanceTransactionPrimaryStatistics {
  serviceNodeName: string;
  errorRate: number;
  latency: number;
  throughput: number;
}

interface ServiceInstanceTransactionComparisonStatistics {
  serviceNodeName: string;
  errorRate: Coordinate[];
  latency: Coordinate[];
  throughput: Coordinate[];
}

type ServiceInstanceTransactionStatistics<T> = T extends true
  ? ServiceInstanceTransactionComparisonStatistics
  : ServiceInstanceTransactionPrimaryStatistics;

export function getOrderInstructions(
  sortField: Exclude<InstancesSortField, 'errorRate'>,
  sortDirection: 'asc' | 'desc'
): Record<string, 'asc' | 'desc'> {
  switch (sortField) {
    case 'latency':
      return { latency: sortDirection };
    case 'serviceNodeName':
      return { _key: sortDirection };
    default:
      return { _count: sortDirection };
  }
}

export async function getServiceInstancesTransactionStatistics<
  T extends true | false
>({
  environment,
  kuery,
  latencyAggregationType,
  apmEventClient,
  transactionType,
  serviceName,
  size,
  searchAggregatedTransactions,
  start,
  end,
  serviceNodeIds,
  numBuckets,
  isComparisonSearch,
  offset,
  sortField,
  sortDirection = 'desc',
}: {
  latencyAggregationType: LatencyAggregationType;
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionType: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  isComparisonSearch: T;
  serviceNodeIds?: string[];
  environment: string;
  kuery: string;
  size?: number;
  numBuckets?: number;
  offset?: string;
  sortField?: InstancesSortField;
  sortDirection?: 'asc' | 'desc';
}): Promise<Array<ServiceInstanceTransactionStatistics<T>>> {
  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString, bucketSize } = getBucketSizeForAggregatedTransactions(
    {
      start: startWithOffset,
      end: endWithOffset,
      numBuckets,
      searchAggregatedTransactions,
    }
  );

  const field = getDurationFieldForTransactions(searchAggregatedTransactions);

  const subAggs = {
    ...getLatencyAggregation(latencyAggregationType, field),
    eventOutcomes: {
      terms: { field: EVENT_OUTCOME },
    },
    errorRate: {
      bucket_script: {
        gap_policy: 'insert_zeros' as estypes.AggregationsGapPolicy,
        buckets_path: {
          success: "eventOutcomes['success']._count",
          failure: "eventOutcomes['failure']._count",
        },
        script: `
          def success = params.success ?: 0;
          def failure = params.failure ?: 0;
          return (success + failure) > 0 ? failure / (success + failure) : 0;
        `,
      },
    },
    ...(sortField === 'errorRate'
      ? {
          errorRateSort: {
            bucket_sort: {
              sort: [{ errorRate: { order: sortDirection } }],
            },
          },
        }
      : {}),
  };

  const query = {
    bool: {
      filter: [
        { term: { [SERVICE_NAME]: serviceName } },
        { term: { [TRANSACTION_TYPE]: transactionType } },
        ...getBackwardCompatibleDocumentTypeFilter(
          searchAggregatedTransactions
        ),
        ...rangeQuery(startWithOffset, endWithOffset),
        ...environmentQuery(environment),
        ...kqlQuery(kuery),
        ...getBackwardCompatibleDocumentTypeFilter(
          searchAggregatedTransactions
        ),
        ...(serviceNodeIds?.length
          ? [{ terms: { [SERVICE_NODE_NAME]: serviceNodeIds } }]
          : []),
      ],
    },
  };

  const aggs = {
    [SERVICE_NODE_NAME]: {
      terms: {
        field: SERVICE_NODE_NAME,
        missing: SERVICE_NODE_NAME_MISSING,
        ...(size ? { size } : {}),
        ...(serviceNodeIds?.length ? { include: serviceNodeIds } : {}),
        ...(sortField && sortField !== 'errorRate'
          ? { order: getOrderInstructions(sortField, sortDirection) }
          : {}),
      },
      aggs: isComparisonSearch
        ? {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: startWithOffset, max: endWithOffset },
              },
              aggs: subAggs,
            },
          }
        : subAggs,
    },
  };

  const response = await apmEventClient.search(
    'get_service_instances_transaction_statistics',
    {
      apm: {
        events: [
          getProcessorEventForTransactions(searchAggregatedTransactions),
        ],
      },
      body: { size: 0, track_total_hits: false, query, aggs },
    }
  );

  const bucketSizeInMinutes = bucketSize / 60;

  return (
    (response.aggregations?.[SERVICE_NODE_NAME].buckets.map(
      (serviceNodeBucket) => {
        const { doc_count: count, key } = serviceNodeBucket;
        const serviceNodeName = String(key);

        // Timeseries is returned when isComparisonSearch is true
        if ('timeseries' in serviceNodeBucket) {
          const { timeseries } = serviceNodeBucket;
          return {
            serviceNodeName,
            errorRate: timeseries.buckets.map((dateBucket) => ({
              x: dateBucket.key,
              y: dateBucket.errorRate.value,
            })),
            throughput: timeseries.buckets.map((dateBucket) => ({
              x: dateBucket.key,
              y: dateBucket.doc_count / bucketSizeInMinutes,
            })),
            latency: timeseries.buckets.map((dateBucket) => ({
              x: dateBucket.key,
              y: getLatencyValue({
                aggregation: dateBucket.latency,
                latencyAggregationType,
              }),
            })),
          };
        } else {
          const { latency, errorRate } = serviceNodeBucket;
          return {
            serviceNodeName,
            errorRate: errorRate.value,
            latency: getLatencyValue({
              aggregation: latency,
              latencyAggregationType,
            }),
            throughput: calculateThroughputWithRange({
              start: startWithOffset,
              end: endWithOffset,
              value: count,
            }),
          };
        }
      }
    ) as Array<ServiceInstanceTransactionStatistics<T>>) || []
  );
}
