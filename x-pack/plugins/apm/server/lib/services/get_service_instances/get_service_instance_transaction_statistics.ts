/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AggregationOptionsByType,
  AggregationResultOf,
} from 'typings/elasticsearch';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../common/event_outcome';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { environmentQuery, kqlQuery, rangeQuery } from '../../../utils/queries';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../helpers/latency_aggregation_type';
import { Setup } from '../../helpers/setup_request';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';
import { calculateThroughput } from '../../helpers/calculate_throughput';

type ObjectReturnType<T> = T extends true
  ? ComparisonStatistics
  : PrimaryStatistics;

type PrimaryStatistics = AggregationResultOf<
  {
    terms: AggregationOptionsByType['terms'];
    aggs: {
      failures: { filter: AggregationOptionsByType['filter'] };
      latency:
        | { avg: AggregationOptionsByType['avg'] }
        | { percentiles: AggregationOptionsByType['percentiles'] };
    };
  },
  {}
>;

type ComparisonStatistics = AggregationResultOf<
  {
    terms: AggregationOptionsByType['terms'];
    aggs: {
      timeseries: {
        date_histogram: AggregationOptionsByType['date_histogram'];
        aggs: {
          failures: { filter: AggregationOptionsByType['filter'] };
          latency:
            | { avg: AggregationOptionsByType['avg'] }
            | { percentiles: AggregationOptionsByType['percentiles'] };
        };
      };
    };
  },
  {}
>;

async function getServiceInstanceTransactionStatistics<T extends true | false>({
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
  intervalString,
  isComparisonSearch,
}: {
  latencyAggregationType: LatencyAggregationType;
  setup: Setup;
  serviceName: string;
  transactionType: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  serviceNodeIds?: string[];
  environment?: string;
  kuery?: string;
  size?: number;
  intervalString: string;
  isComparisonSearch: T;
}): Promise<ObjectReturnType<T> | undefined> {
  const { apmEventClient } = setup;

  const field = getTransactionDurationFieldForAggregatedTransactions(
    searchAggregatedTransactions
  );

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
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        ...kqlQuery(kuery),
        ...(isComparisonSearch
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

  const response = await apmEventClient.search({
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: { size: 0, query, aggs },
  });
  return response.aggregations?.[SERVICE_NODE_NAME] as ObjectReturnType<T>;
}

export async function getServiceInstanceTransactionPrimaryStatistics(params: {
  latencyAggregationType: LatencyAggregationType;
  setup: Setup;
  serviceName: string;
  transactionType: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  environment?: string;
  kuery?: string;
  size?: number;
  numBuckets?: number;
}) {
  const { start, end, numBuckets, latencyAggregationType } = params;
  const { intervalString } = getBucketSize({
    start,
    end,
    numBuckets,
  });
  const response = await getServiceInstanceTransactionStatistics({
    ...params,
    intervalString,
    isComparisonSearch: false,
  });

  return (
    response?.buckets.map((serviceNodeBucket) => {
      const { doc_count: count, key, failures, latency } = serviceNodeBucket;

      return {
        serviceNodeName: String(key),
        errorRate: failures.doc_count / count,
        latency: getLatencyValue({
          aggregation: latency,
          latencyAggregationType,
        }),
        throughput: calculateThroughput({ start, end, value: count }),
      };
    }) || []
  );
}

export async function getServiceInstanceTransactionComparisonStatistics(params: {
  latencyAggregationType: LatencyAggregationType;
  setup: Setup;
  serviceName: string;
  transactionType: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  environment?: string;
  kuery?: string;
  numBuckets?: number;
  serviceNodeIds: string[];
}) {
  const { start, end, numBuckets, latencyAggregationType } = params;
  const { intervalString, bucketSize } = getBucketSize({
    start,
    end,
    numBuckets,
  });
  const response = await getServiceInstanceTransactionStatistics({
    ...params,
    intervalString,
    isComparisonSearch: true,
  });

  const bucketSizeInMinutes = bucketSize / 60;

  return (
    response?.buckets.map((serviceNodeBucket) => {
      const { key, timeseries } = serviceNodeBucket;
      return {
        serviceNodeName: String(key),
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
    }) || []
  );
}
