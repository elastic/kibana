/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getMetricsDateHistogramParams } from '../../lib/helpers/metrics';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import {
  getDocCountFieldForServiceDestinationStatistics,
  getDocumentTypeFilterForServiceDestinationStatistics,
  getLatencyFieldForServiceDestinationStatistics,
  getProcessorEventForServiceDestinationStatistics,
} from '../../lib/helpers/spans/get_is_using_service_destination_metrics';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getLatencyChartsForDependency({
  dependencyName,
  spanName,
  searchServiceDestinationMetrics,
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  offset,
}: {
  dependencyName: string;
  spanName: string;
  searchServiceDestinationMetrics: boolean;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  offset?: string;
}) {
  const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const response = await apmEventClient.search('get_latency_for_dependency', {
    apm: {
      events: [
        getProcessorEventForServiceDestinationStatistics(
          searchServiceDestinationMetrics
        ),
      ],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...rangeQuery(startWithOffset, endWithOffset),
            ...termQuery(SPAN_NAME, spanName || null),
            ...getDocumentTypeFilterForServiceDestinationStatistics(
              searchServiceDestinationMetrics
            ),
            { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyName } },
          ],
        },
      },
      aggs: {
        timeseries: {
          date_histogram: getMetricsDateHistogramParams({
            start: startWithOffset,
            end: endWithOffset,
            metricsInterval: 60,
          }),
          aggs: {
            latency_sum: {
              sum: {
                field: getLatencyFieldForServiceDestinationStatistics(
                  searchServiceDestinationMetrics
                ),
              },
            },
            ...(searchServiceDestinationMetrics
              ? {
                  latency_count: {
                    sum: {
                      field: getDocCountFieldForServiceDestinationStatistics(
                        searchServiceDestinationMetrics
                      ),
                    },
                  },
                }
              : {}),
          },
        },
      },
    },
  });

  return (
    response.aggregations?.timeseries.buckets.map((bucket) => {
      return {
        x: bucket.key + offsetInMs,
        y:
          (bucket.latency_sum.value ?? 0) /
          (bucket.latency_count?.value ?? bucket.doc_count),
      };
    }) ?? []
  );
}
