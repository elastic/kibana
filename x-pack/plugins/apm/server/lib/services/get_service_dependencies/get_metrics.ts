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
import { EventOutcome } from '../../../../common/event_outcome';
import { ProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery, rangeQuery } from '../../../../server/utils/queries';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

function getPeriodAggregation(start: number, end: number, numBuckets: number) {
  return {
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: getBucketSize({
          start,
          end,
          numBuckets,
        }).intervalString,
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
  };
}

export const getMetrics = ({
  setup,
  serviceName,
  environment,
  numBuckets,
  comparisonStart,
  comparisonEnd,
}: {
  setup: Setup & SetupTimeRange;
  serviceName: string;
  environment?: string;
  numBuckets: number;
  comparisonStart: number;
  comparisonEnd: number;
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
              current_period: {
                filter: rangeQuery(start, end)[0],
                aggs: getPeriodAggregation(start, end, numBuckets),
              },
              previous_period: {
                filter: rangeQuery(comparisonStart, comparisonEnd)[0],
                aggs: getPeriodAggregation(
                  comparisonStart,
                  comparisonEnd,
                  numBuckets
                ),
              },
            },
          },
        },
      },
    });

    return (
      response.aggregations?.connections.buckets.map((bucket) => {
        const {
          key,
          current_period: currentPeriod,
          previous_period: previousPeriod,
        } = bucket;

        return {
          span: { destination: { service: { resource: String(key) } } },
          currentPeriod: {
            value: {
              count: sum(
                currentPeriod.timeseries.buckets.map(
                  (dateBucket) => dateBucket.count.value ?? 0
                )
              ),
              latency_sum: sum(
                currentPeriod.timeseries.buckets.map(
                  (dateBucket) => dateBucket.latency_sum.value ?? 0
                )
              ),
              error_count: sum(
                currentPeriod.timeseries.buckets.flatMap(
                  (dateBucket) =>
                    dateBucket[EVENT_OUTCOME].buckets.find(
                      (outcomeBucket) =>
                        outcomeBucket.key === EventOutcome.failure
                    )?.count.value ?? 0
                )
              ),
            },
            timeseries: currentPeriod.timeseries.buckets.map((dateBucket) => ({
              x: dateBucket.key,
              count: dateBucket.count.value ?? 0,
              latency_sum: dateBucket.latency_sum.value ?? 0,
              error_count:
                dateBucket[EVENT_OUTCOME].buckets.find(
                  (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
                )?.count.value ?? 0,
            })),
          },
          previousPeriod: {
            value: {
              count: sum(
                previousPeriod.timeseries.buckets.map(
                  (dateBucket) => dateBucket.count.value ?? 0
                )
              ),
              latency_sum: sum(
                previousPeriod.timeseries.buckets.map(
                  (dateBucket) => dateBucket.latency_sum.value ?? 0
                )
              ),
              error_count: sum(
                previousPeriod.timeseries.buckets.flatMap(
                  (dateBucket) =>
                    dateBucket[EVENT_OUTCOME].buckets.find(
                      (outcomeBucket) =>
                        outcomeBucket.key === EventOutcome.failure
                    )?.count.value ?? 0
                )
              ),
            },
            timeseries: previousPeriod.timeseries.buckets.map((dateBucket) => ({
              x: dateBucket.key,
              count: dateBucket.count.value ?? 0,
              latency_sum: dateBucket.latency_sum.value ?? 0,
              error_count:
                dateBucket[EVENT_OUTCOME].buckets.find(
                  (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
                )?.count.value ?? 0,
            })),
          },
        };
      }) ?? []
    );
  });
};
