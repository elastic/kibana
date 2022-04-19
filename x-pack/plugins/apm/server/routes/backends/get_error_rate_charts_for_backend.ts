/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { EventOutcome } from '../../../common/event_outcome';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';
import { getMetricsDateHistogramParams } from '../../lib/helpers/metrics';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';

export async function getErrorRateChartsForBackend({
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

  const response = await apmEventClient.search('get_error_rate_for_backend', {
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
            failures: {
              filter: {
                term: {
                  [EVENT_OUTCOME]: EventOutcome.failure,
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.timeseries.buckets.map((bucket) => {
      const totalCount = bucket.doc_count;
      const failureCount = bucket.failures.doc_count;

      return {
        x: bucket.key + offsetInMs,
        y: failureCount / totalCount,
      };
    }) ?? []
  );
}
