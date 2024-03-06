/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  METRICSET_NAME,
  METRICSET_INTERVAL,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  SPAN_DURATION,
  SPAN_NAME,
} from '../../../../common/es_fields/apm';
import { APMEventClient } from '../create_es_client/create_apm_event_client';

export function getProcessorEventForServiceDestinationStatistics(
  searchServiceDestinationMetrics: boolean
) {
  return searchServiceDestinationMetrics
    ? ProcessorEvent.metric
    : ProcessorEvent.span;
}

export function getDocumentTypeFilterForServiceDestinationStatistics(
  searchServiceDestinationMetrics: boolean
) {
  return searchServiceDestinationMetrics
    ? [
        {
          bool: {
            filter: termQuery(METRICSET_NAME, 'service_destination'),
            must_not: {
              terms: {
                [METRICSET_INTERVAL]: ['10m', '60m'],
              },
            },
          },
        },
      ]
    : [];
}

export function getLatencyFieldForServiceDestinationStatistics(
  searchServiceDestinationMetrics: boolean
) {
  return searchServiceDestinationMetrics
    ? SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM
    : SPAN_DURATION;
}

export function getDocCountFieldForServiceDestinationStatistics(
  searchServiceDestinationMetrics: boolean
) {
  return searchServiceDestinationMetrics
    ? SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT
    : undefined;
}

export async function getIsUsingServiceDestinationMetrics({
  apmEventClient,
  useSpanName,
  kuery,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  useSpanName: boolean;
  kuery: string;
  start: number;
  end: number;
}) {
  async function getServiceDestinationMetricsCount(
    query?: QueryDslQueryContainer
  ) {
    const response = await apmEventClient.search(
      'get_service_destination_metrics_count',
      {
        apm: {
          events: [getProcessorEventForServiceDestinationStatistics(true)],
        },
        body: {
          track_total_hits: 1,
          size: 0,
          terminate_after: 1,
          query: {
            bool: {
              filter: [
                ...rangeQuery(start, end),
                ...kqlQuery(kuery),
                ...getDocumentTypeFilterForServiceDestinationStatistics(true),
                ...(query ? [query] : []),
              ],
            },
          },
        },
      }
    );

    return response.hits.total.value;
  }

  if (!useSpanName) {
    // if span.name is not required,
    // use service destination metrics if there is at least one service destination metric
    // for the given time range
    return (await getServiceDestinationMetricsCount()) > 0;
  }

  const [
    anyServiceDestinationMetricsCount,
    serviceDestinationMetricsWithoutSpanNameCount,
  ] = await Promise.all([
    getServiceDestinationMetricsCount(),
    getServiceDestinationMetricsCount({
      bool: { must_not: [{ exists: { field: SPAN_NAME } }] },
    }),
  ]);

  return (
    // use service destination metrics, IF:
    // - there is at least ONE service destination metric for the given time range
    // - AND, there is NO service destination metric WITHOUT span.name for the given time range
    anyServiceDestinationMetricsCount > 0 &&
    serviceDestinationMetricsWithoutSpanNameCount === 0
  );
}
