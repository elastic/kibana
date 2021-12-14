/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '../../../../observability/server';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { withApmSpan } from '../../utils/with_apm_span';
import { calculateThroughputWithRange } from '../../lib/helpers/calculate_throughput';
import { Setup } from '../../lib/helpers/setup_request';
import { getBucketSize } from '../../lib/helpers/get_bucket_size';
import { getFailedTransactionRateTimeSeries } from '../../lib/helpers/transaction_error_rate';
import { NodeStats } from '../../../common/service_map';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';

interface Options {
  setup: Setup;
  environment: string;
  backendName: string;
  start: number;
  end: number;
  offset?: string;
}

export function getServiceMapBackendNodeInfo({
  environment,
  backendName,
  setup,
  start,
  end,
  offset,
}: Options): Promise<NodeStats> {
  return withApmSpan('get_service_map_backend_node_stats', async () => {
    const { apmEventClient } = setup;
    const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
      start,
      end,
      offset,
    });

    const { intervalString } = getBucketSize({
      start: startWithOffset,
      end: endWithOffset,
      numBuckets: 20,
    });

    const subAggs = {
      latency_sum: {
        sum: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM },
      },
      count: {
        sum: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT },
      },
      outcomes: {
        terms: { field: EVENT_OUTCOME, include: [EventOutcome.failure] },
      },
    };

    const response = await apmEventClient.search(
      'get_service_map_backend_node_stats',
      {
        apm: {
          events: [ProcessorEvent.metric],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: backendName } },
                ...rangeQuery(startWithOffset, endWithOffset),
                ...environmentQuery(environment),
              ],
            },
          },
          aggs: {
            ...subAggs,
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: startWithOffset, max: endWithOffset },
              },
              aggs: subAggs,
            },
          },
        },
      }
    );

    const count = response.aggregations?.count.value ?? 0;
    const failedTransactionsRateCount =
      response.aggregations?.outcomes.buckets[0]?.doc_count ?? 0;
    const latencySum = response.aggregations?.latency_sum.value ?? 0;

    const avgFailedTransactionsRate = failedTransactionsRateCount / count;
    const latency = latencySum / count;
    const throughput = calculateThroughputWithRange({
      start: startWithOffset,
      end: endWithOffset,
      value: count,
    });

    if (count === 0) {
      return {
        failedTransactionsRate: undefined,
        transactionStats: {
          throughput: undefined,
          latency: undefined,
        },
      };
    }

    return {
      failedTransactionsRate: {
        value: avgFailedTransactionsRate,
        timeseries: response.aggregations?.timeseries
          ? getFailedTransactionRateTimeSeries(
              response.aggregations.timeseries.buckets
            ).map(({ x, y }) => ({ x: x + offsetInMs, y }))
          : undefined,
      },
      transactionStats: {
        throughput: {
          value: throughput,
          timeseries: response.aggregations?.timeseries.buckets.map(
            (bucket) => {
              return {
                x: bucket.key + offsetInMs,
                y: calculateThroughputWithRange({
                  start,
                  end,
                  value: bucket.doc_count ?? 0,
                }),
              };
            }
          ),
        },
        latency: {
          value: latency,
          timeseries: response.aggregations?.timeseries.buckets.map(
            (bucket) => ({
              x: bucket.key + offsetInMs,
              y: bucket.latency_sum.value,
            })
          ),
        },
      },
    };
  });
}
