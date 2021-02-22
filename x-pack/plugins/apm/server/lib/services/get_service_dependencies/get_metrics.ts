/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery, rangeQuery } from '../../../../common/utils/queries';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { EventOutcome } from '../../../../common/event_outcome';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { withApmSpan } from '../../../utils/with_apm_span';

export const getMetrics = ({
  setup,
  serviceName,
  environment,
  numBuckets,
}: {
  setup: Setup & SetupTimeRange;
  serviceName: string;
  environment?: string;
  numBuckets: number;
}) => {
  return withApmSpan('get_service_destination_metrics', async () => {
    const { start, end, apmEventClient } = setup;

    const response = await apmEventClient.search({
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        track_total_hits: true,
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: serviceName } },
              {
                exists: { field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT },
              },
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
            ],
          },
        },
        aggs: {
          connections: {
            terms: {
              field: SPAN_DESTINATION_SERVICE_RESOURCE,
              size: 100,
            },
            aggs: {
              timeseries: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: getBucketSize({ start, end, numBuckets })
                    .intervalString,
                  extended_bounds: {
                    min: start,
                    max: end,
                  },
                },
                aggs: {
                  latency_sum: {
                    sum: {
                      field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
                    },
                  },
                  count: {
                    sum: {
                      field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                    },
                  },
                  [EVENT_OUTCOME]: {
                    terms: {
                      field: EVENT_OUTCOME,
                    },
                    aggs: {
                      count: {
                        sum: {
                          field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return (
      response.aggregations?.connections.buckets.map((bucket) => ({
        span: {
          destination: {
            service: {
              resource: String(bucket.key),
            },
          },
        },
        value: {
          count: sum(
            bucket.timeseries.buckets.map(
              (dateBucket) => dateBucket.count.value ?? 0
            )
          ),
          latency_sum: sum(
            bucket.timeseries.buckets.map(
              (dateBucket) => dateBucket.latency_sum.value ?? 0
            )
          ),
          error_count: sum(
            bucket.timeseries.buckets.flatMap(
              (dateBucket) =>
                dateBucket[EVENT_OUTCOME].buckets.find(
                  (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
                )?.count.value ?? 0
            )
          ),
        },
        timeseries: bucket.timeseries.buckets.map((dateBucket) => ({
          x: dateBucket.key,
          count: dateBucket.count.value ?? 0,
          latency_sum: dateBucket.latency_sum.value ?? 0,
          error_count:
            dateBucket[EVENT_OUTCOME].buckets.find(
              (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
            )?.count.value ?? 0,
        })),
      })) ?? []
    );
  });
};
