/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
} from '../../../common/es_fields/apm';
import { EventOutcome } from '../../../common/event_outcome';
import { environmentQuery } from '../../../common/utils/environment_query';
import { withApmSpan } from '../../utils/with_apm_span';
import { calculateThroughputWithRange } from '../../lib/helpers/calculate_throughput';
import { getBucketSize } from '../../lib/helpers/get_bucket_size';
import { getFailedTransactionRateTimeSeries } from '../../lib/helpers/transaction_error_rate';
import { NodeStats } from '../../../common/service_map';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

interface Options {
  apmEventClient: APMEventClient;
  environment: string;
  dependencyName: string;
  start: number;
  end: number;
  offset?: string;
}

export function getServiceMapDependencyNodeInfo({
  environment,
  dependencyName,
  apmEventClient,
  start,
  end,
  offset,
}: Options): Promise<NodeStats> {
  return withApmSpan('get_service_map_dependency_node_stats', async () => {
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
      'get_service_map_dependency_node_stats',
      {
        apm: {
          events: [ProcessorEvent.metric],
        },
        body: {
          track_total_hits: false,
          size: 0,
          query: {
            bool: {
              filter: [
                {
                  term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyName },
                },
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
