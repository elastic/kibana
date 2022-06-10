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
import { EventOutcome } from '../../../common/event_outcome';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Setup } from '../../lib/helpers/setup_request';
import { getMetricsDateHistogramParams } from '../../lib/helpers/metrics';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import {
  getDocCountFieldForServiceDestinationStatistics,
  getDocumentTypeFilterForServiceDestinationStatistics,
  getProcessorEventForServiceDestinationStatistics,
} from '../../lib/helpers/spans/get_is_using_service_destination_metrics';

export async function getErrorRateChartsForBackend({
  backendName,
  spanName,
  setup,
  start,
  end,
  environment,
  kuery,
  searchServiceDestinationMetrics,
  offset,
}: {
  backendName: string;
  spanName: string;
  setup: Setup;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  searchServiceDestinationMetrics: boolean;
  offset?: string;
}) {
  const { apmEventClient } = setup;

  const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const response = await apmEventClient.search('get_error_rate_for_backend', {
    apm: {
      events: [
        getProcessorEventForServiceDestinationStatistics(
          searchServiceDestinationMetrics
        ),
      ],
    },
    body: {
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
            { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: backendName } },
            {
              terms: {
                [EVENT_OUTCOME]: [EventOutcome.success, EventOutcome.failure],
              },
            },
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
            ...(searchServiceDestinationMetrics
              ? {
                  total_count: {
                    sum: {
                      field: getDocCountFieldForServiceDestinationStatistics(
                        searchServiceDestinationMetrics
                      ),
                    },
                  },
                }
              : {}),
            failures: {
              filter: {
                term: {
                  [EVENT_OUTCOME]: EventOutcome.failure,
                },
              },
              aggs: {
                ...(searchServiceDestinationMetrics
                  ? {
                      total_count: {
                        sum: {
                          field:
                            getDocCountFieldForServiceDestinationStatistics(
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
      },
    },
  });

  return (
    response.aggregations?.timeseries.buckets.map((bucket) => {
      const totalCount = bucket.total_count?.value ?? bucket.doc_count;
      const failureCount =
        bucket.failures.total_count?.value ?? bucket.failures.doc_count;

      return {
        x: bucket.key + offsetInMs,
        y: failureCount / totalCount,
      };
    }) ?? []
  );
}
