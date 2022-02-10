/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../common/event_outcome';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import { Coordinate } from '../../../../typings/timeseries';
import { kqlQuery, rangeQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { calculateThroughput } from '../../../lib/helpers/calculate_throughput';
import { getBucketSizeForAggregatedTransactions } from '../../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../../lib/helpers/latency_aggregation_type';
import { Setup } from '../../../lib/helpers/setup_request';

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

export async function getServiceInstancesTransactionStatistics<
  T extends true | false
>({
  environment,
  kuery,
  latencyAggregationType,
  setup,
  transactionType,
  serviceName,
  size,
  searchAggregatedTransactions,
  start,
  end,
  serviceNodeIds,
  numBuckets,
  isComparisonSearch,
}: {
  latencyAggregationType: LatencyAggregationType;
  setup: Setup;
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
}): Promise<Array<ServiceInstanceTransactionStatistics<T>>> {
  const { apmEventClient } = setup;

  const { intervalString, bucketSize } = getBucketSizeForAggregatedTransactions(
    {
      start,
      end,
      numBuckets,
      searchAggregatedTransactions,
    }
  );

  const field = getDurationFieldForTransactions(searchAggregatedTransactions);

  const subAggs = {
    ...getLatencyAggregation(latencyAggregationType, field),
    failures: {
      filter: {
        term: {
          [EVENT_OUTCOME]: EventOutcome.failure,
        },
      },
    },
  };

  const query = {
    bool: {
      filter: [
        { term: { [SERVICE_NAME]: serviceName } },
        { term: { [TRANSACTION_TYPE]: transactionType } },
        ...getDocumentTypeFilterForTransactions(searchAggregatedTransactions),
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        ...kqlQuery(kuery),
        ...getDocumentTypeFilterForTransactions(searchAggregatedTransactions),
        ...(isComparisonSearch && serviceNodeIds
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
        ...(isComparisonSearch ? { include: serviceNodeIds } : {}),
      },
      aggs: isComparisonSearch
        ? {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: start, max: end },
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
      body: { size: 0, query, aggs },
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
              y: dateBucket.failures.doc_count / dateBucket.doc_count,
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
          const { failures, latency } = serviceNodeBucket;
          return {
            serviceNodeName,
            errorRate: failures.doc_count / count,
            latency: getLatencyValue({
              aggregation: latency,
              latencyAggregationType,
            }),
            throughput: calculateThroughput({ start, end, value: count }),
          };
        }
      }
    ) as Array<ServiceInstanceTransactionStatistics<T>>) || []
  );
}
