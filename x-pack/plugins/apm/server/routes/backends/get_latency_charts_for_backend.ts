/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { kqlQuery, rangeQuery } from '../../../../observability/server';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';
import { getMetricsDateHistogramParams } from '../../lib/helpers/metrics';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';

export async function getLatencyChartsForBackend({
  backendName,
  setup,
  start,
  end,
  environment,
  kuery,
  offset,
}: {
  backendName: string;
  setup: Setup;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  offset?: string;
}) {
  const { apmEventClient } = setup;

  const { offsetInMs, startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const response = await apmEventClient.search('get_latency_for_backend', {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...rangeQuery(startWithOffset, endWithOffset),
            { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: backendName } },
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
                field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
              },
            },
            latency_count: {
              sum: {
                field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.timeseries.buckets.map((bucket) => {
      return {
        x: bucket.key + offsetInMs,
        y: (bucket.latency_sum.value ?? 0) / (bucket.latency_count.value ?? 0),
      };
    }) ?? []
  );
}
