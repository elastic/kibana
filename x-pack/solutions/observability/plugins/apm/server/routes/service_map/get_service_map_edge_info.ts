/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType } from '../../../common/document_type';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
} from '../../../common/es_fields/apm';
import type { NodeStats } from '../../../common/service_map';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { calculateThroughputWithRange } from '../../lib/helpers/calculate_throughput';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getDocumentTypeFilterForServiceDestinationStatistics } from '../../lib/helpers/spans/get_is_using_service_destination_metrics';
import {
  calculateFailedTransactionRate,
  getFailedTransactionRateTimeSeries,
  getOutcomeAggregation,
} from '../../lib/helpers/transaction_error_rate';
import { withApmSpan } from '../../utils/with_apm_span';

interface Options {
  apmEventClient: APMEventClient;
  environment: string;
  sourceServiceName: string;
  resources: string[];
  start: number;
  end: number;
  offset?: string;
}
export interface ServiceMapEdgeInfoResponse {
  currentPeriod: NodeStats;
  previousPeriod: NodeStats | undefined;
}

function getServiceMapEdgeInfoForTimeRange({
  environment,
  sourceServiceName,
  resources,
  apmEventClient,
  start,
  end,
  offset,
}: Options): Promise<NodeStats> {
  return withApmSpan('get_service_map_edge_stats', async () => {
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
      ...getOutcomeAggregation(ApmDocumentType.ServiceDestinationMetric),
    };

    const response = await apmEventClient.search('get_service_map_edge_stats', {
      apm: {
        events: [ProcessorEvent.metric],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...getDocumentTypeFilterForServiceDestinationStatistics(true),
            { term: { [SERVICE_NAME]: sourceServiceName } },
            { terms: { [SPAN_DESTINATION_SERVICE_RESOURCE]: resources } },
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
    });

    const count = response.aggregations?.count.value ?? 0;

    const latencySum = response.aggregations?.latency_sum.value ?? 0;

    const avgFailedTransactionsRate = response.aggregations
      ? calculateFailedTransactionRate(response.aggregations)
      : null;

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
          ? getFailedTransactionRateTimeSeries(response.aggregations.timeseries.buckets).map(
              ({ x, y }) => ({ x: x + offsetInMs, y })
            )
          : undefined,
      },
      transactionStats: {
        throughput: {
          value: throughput,
          timeseries: response.aggregations?.timeseries.buckets.map((bucket) => {
            return {
              x: bucket.key + offsetInMs,
              y: calculateThroughputWithRange({
                start,
                end,
                value: bucket.doc_count ?? 0,
              }),
            };
          }),
        },
        latency: {
          value: latency,
          timeseries: response.aggregations?.timeseries.buckets.map((bucket) => ({
            x: bucket.key + offsetInMs,
            y: bucket.latency_sum.value,
          })),
        },
      },
    };
  });
}

export async function getServiceMapEdgeInfo({
  apmEventClient,
  sourceServiceName,
  resources,
  start,
  end,
  environment,
  offset,
}: Options): Promise<ServiceMapEdgeInfoResponse> {
  const commonProps = {
    environment,
    apmEventClient,
    sourceServiceName,
    resources,
    start,
    end,
  };

  const [currentPeriod, previousPeriod] = await Promise.all([
    getServiceMapEdgeInfoForTimeRange(commonProps),
    offset ? getServiceMapEdgeInfoForTimeRange({ ...commonProps, offset }) : undefined,
  ]);

  return { currentPeriod, previousPeriod };
}
