/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { kqlQuery, rangeQuery } from '../../../../observability/server';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../helpers/setup_request';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { getBucketSize } from '../helpers/get_bucket_size';
import { calculateThroughputWithInterval } from '../helpers/calculate_throughput';

export async function getThroughputChartsForBackend({
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

  const { intervalString, bucketSize } = getBucketSize({
    start: startWithOffset,
    end: endWithOffset,
    minBucketSize: 60,
  });

  const response = await apmEventClient.search('get_throughput_for_backend', {
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
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: startWithOffset, max: endWithOffset },
          },
          aggs: {
            spanDestinationLatencySum: {
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
        y: calculateThroughputWithInterval({
          bucketSize,
          value: bucket.spanDestinationLatencySum.value || 0,
        }),
      };
    }) ?? []
  );
}
