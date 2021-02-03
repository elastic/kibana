/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventOutcome } from '../../../../common/event_outcome';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { SERVICE_NODE_NAME_MISSING } from '../../../../common/service_nodes';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ServiceInstanceParams } from '.';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';
import { calculateThroughput } from '../../helpers/calculate_throughput';

export async function getServiceInstanceTransactionStats({
  setup,
  transactionType,
  serviceName,
  size,
  searchAggregatedTransactions,
  numBuckets,
}: ServiceInstanceParams) {
  const { apmEventClient, start, end, esFilter } = setup;

  const { intervalString, bucketSize } = getBucketSize({
    start,
    end,
    numBuckets,
  });

  const field = getTransactionDurationFieldForAggregatedTransactions(
    searchAggregatedTransactions
  );

  const subAggs = {
    avg_transaction_duration: {
      avg: {
        field,
      },
    },
    failures: {
      filter: {
        term: {
          [EVENT_OUTCOME]: EventOutcome.failure,
        },
      },
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
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: rangeFilter(start, end) },
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            ...esFilter,
          ],
        },
      },
      aggs: {
        [SERVICE_NODE_NAME]: {
          terms: {
            field: SERVICE_NODE_NAME,
            missing: SERVICE_NODE_NAME_MISSING,
            size,
          },
          aggs: {
            ...subAggs,
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: {
                  min: start,
                  max: end,
                },
              },
              aggs: {
                ...subAggs,
              },
            },
          },
        },
      },
    },
  });

  const bucketSizeInMinutes = bucketSize / 60;

  return (
    response.aggregations?.[SERVICE_NODE_NAME].buckets.map(
      (serviceNodeBucket) => {
        const {
          doc_count: count,
          avg_transaction_duration: avgTransactionDuration,
          key,
          failures,
          timeseries,
        } = serviceNodeBucket;

        return {
          serviceNodeName: String(key),
          errorRate: {
            value: failures.doc_count / count,
            timeseries: timeseries.buckets.map((dateBucket) => ({
              x: dateBucket.key,
              y: dateBucket.failures.doc_count / dateBucket.doc_count,
            })),
          },
          throughput: {
            value: calculateThroughput({ start, end, value: count }),
            timeseries: timeseries.buckets.map((dateBucket) => ({
              x: dateBucket.key,
              y: dateBucket.doc_count / bucketSizeInMinutes,
            })),
          },
          latency: {
            value: avgTransactionDuration.value,
            timeseries: timeseries.buckets.map((dateBucket) => ({
              x: dateBucket.key,
              y: dateBucket.avg_transaction_duration.value,
            })),
          },
        };
      }
    ) ?? []
  );
}
