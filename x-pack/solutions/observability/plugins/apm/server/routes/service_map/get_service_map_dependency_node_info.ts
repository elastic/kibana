/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapServiceDependencyInfoResponse } from '@kbn/apm-api-shared';
import {
  calculateFailedTransactionRate,
  calculateThroughputWithRange,
  getOutcomeAggregation,
} from '@kbn/apm-data-access-plugin/server/utils';
import type { NodeStats } from '@kbn/apm-types';
import { LatencyAggregationType } from '@kbn/apm-types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { calculateThroughputWithInterval } from '../../lib/helpers/calculate_throughput';
import { ApmDocumentType } from '../../../common/document_type';
import {
  AT_TIMESTAMP,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  SPAN_DURATION,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getDocumentTypeFilterForServiceDestinationStatistics } from '../../lib/helpers/spans/get_is_using_service_destination_metrics';
import { getFailedTransactionRateTimeSeries } from '../../lib/helpers/transaction_error_rate';
import { getLatencyAggregation, getLatencyValue } from '../../lib/helpers/latency_aggregation_type';
import { withApmSpan } from '../../utils/with_apm_span';

interface Options {
  apmEventClient: APMEventClient;
  environment: string;
  dependencies: string[];
  sourceServiceName?: string;
  start: number;
  end: number;
  offset?: string;
  latencyAggregationType?: LatencyAggregationType;
}

function getServiceMapDependencyNodeInfoForTimeRange({
  environment,
  dependencies,
  sourceServiceName,
  apmEventClient,
  start,
  end,
  offset,
  latencyAggregationType = LatencyAggregationType.avg,
}: Options): Promise<NodeStats> {
  return withApmSpan('get_service_map_dependency_node_stats', async () => {
    const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
      start,
      end,
      offset,
    });

    const { intervalString, bucketSize } = getBucketSize({
      start: startWithOffset,
      end: endWithOffset,
      numBuckets: 20,
    });

    const connectionFilter = [
      { terms: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencies } },
      ...(sourceServiceName ? [{ term: { [SERVICE_NAME]: sourceServiceName } }] : []),
      ...rangeQuery(startWithOffset, endWithOffset),
      ...environmentQuery(environment),
    ];

    const subAggs = {
      latency_sum: {
        sum: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM },
      },
      count: {
        sum: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT },
      },
      ...getOutcomeAggregation(ApmDocumentType.ServiceDestinationMetric),
    };

    // Rollup search: always used for throughput + failed transaction rate.
    // Also used for avg latency.
    const rollupSearch = apmEventClient.search('get_service_map_dependency_node_stats', {
      apm: {
        events: [ProcessorEvent.metric],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...getDocumentTypeFilterForServiceDestinationStatistics(true),
            ...connectionFilter,
          ],
        },
      },
      aggs: {
        ...subAggs,
        timeseries: {
          date_histogram: {
            field: AT_TIMESTAMP,
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: startWithOffset, max: endWithOffset },
          },
          aggs: subAggs,
        },
      },
    });

    const isPercentile =
      latencyAggregationType === LatencyAggregationType.p95 ||
      latencyAggregationType === LatencyAggregationType.p99;

    // p95/p99 latency needs the raw span documents: percentiles cannot be computed from the
    // pre-aggregated rollup, so both requests run in parallel.
    const percentileSearch = isPercentile
      ? apmEventClient.search('get_service_map_dependency_node_stats_percentile', {
          apm: {
            events: [ProcessorEvent.span],
          },
          track_total_hits: false,
          size: 0,
          query: {
            bool: {
              filter: connectionFilter,
            },
          },
          aggs: {
            ...getLatencyAggregation(latencyAggregationType, SPAN_DURATION),
            timeseries: {
              date_histogram: {
                field: AT_TIMESTAMP,
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: startWithOffset, max: endWithOffset },
              },
              aggs: getLatencyAggregation(latencyAggregationType, SPAN_DURATION),
            },
          },
        })
      : undefined;

    const [rollupResponse, spanResponse] = await Promise.all([rollupSearch, percentileSearch]);

    const count = rollupResponse.aggregations?.count.value ?? 0;
    const latencySum = rollupResponse.aggregations?.latency_sum.value ?? 0;

    const avgFailedTransactionsRate = rollupResponse.aggregations
      ? calculateFailedTransactionRate(rollupResponse.aggregations)
      : null;

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

    // p95/p99 latency needs the raw span documents: percentiles cannot be computed from the
    // pre-aggregated response_time.sum.us rollup. The average comes from the rollup, so the
    // numbers of the different aggregation types do not come from the same data source.
    let latencyValue: number | null = latencySum / count;
    let latencyTimeseries: Array<{ x: number; y: number | null }> | undefined =
      rollupResponse.aggregations?.timeseries.buckets.map((bucket) => ({
        x: bucket.key + offsetInMs,
        y:
          bucket.count.value && bucket.latency_sum.value != null
            ? bucket.latency_sum.value / bucket.count.value
            : null,
      }));

    if (isPercentile && spanResponse) {
      latencyValue = spanResponse.aggregations?.latency
        ? getLatencyValue({
            latencyAggregationType,
            aggregation: spanResponse.aggregations.latency as
              | { value: number | null }
              | { values: Record<string, number | null> },
          })
        : null;

      latencyTimeseries = spanResponse.aggregations?.timeseries.buckets.map((bucket) => ({
        x: bucket.key + offsetInMs,
        y: bucket.latency
          ? getLatencyValue({
              latencyAggregationType,
              aggregation: bucket.latency as
                | { value: number | null }
                | { values: Record<string, number | null> },
            })
          : null,
      }));
    }

    return {
      failedTransactionsRate: {
        value: avgFailedTransactionsRate,
        timeseries: rollupResponse.aggregations?.timeseries
          ? getFailedTransactionRateTimeSeries(rollupResponse.aggregations.timeseries.buckets).map(
              ({ x, y }) => ({ x: x + offsetInMs, y })
            )
          : undefined,
      },
      transactionStats: {
        throughput: {
          value: throughput,
          timeseries: rollupResponse.aggregations?.timeseries.buckets.map((bucket) => {
            return {
              x: bucket.key + offsetInMs,
              // The summed span count of the bucket (not the number of metric documents),
              // normalized by the bucket interval, not by the whole range.
              y: calculateThroughputWithInterval({
                bucketSize,
                value: bucket.count.value ?? 0,
              }),
            };
          }),
        },
        latency: {
          value: latencyValue,
          timeseries: latencyTimeseries,
        },
      },
    };
  });
}

export async function getServiceMapDependencyNodeInfo({
  apmEventClient,
  dependencies,
  sourceServiceName,
  start,
  end,
  environment,
  offset,
  latencyAggregationType,
}: Options): Promise<ServiceMapServiceDependencyInfoResponse> {
  const commonProps = {
    environment,
    apmEventClient,
    dependencies,
    sourceServiceName,
    start,
    end,
    latencyAggregationType,
  };

  const [currentPeriod, previousPeriod] = await Promise.all([
    getServiceMapDependencyNodeInfoForTimeRange(commonProps),
    offset ? getServiceMapDependencyNodeInfoForTimeRange({ ...commonProps, offset }) : undefined,
  ]);

  return { currentPeriod, previousPeriod };
}
