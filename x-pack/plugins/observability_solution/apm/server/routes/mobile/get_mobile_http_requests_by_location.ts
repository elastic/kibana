/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_NAME, SPAN_SUBTYPE, SPAN_TYPE } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { getBucketSize } from '../../../common/utils/get_bucket_size';

interface Props {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
  locationField?: string;
  offset?: string;
}

export async function getHttpRequestsByLocation({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  locationField,
  offset,
}: Props) {
  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString } = getBucketSize({
    start: startWithOffset,
    end: endWithOffset,
    minBucketSize: 60,
  });

  const aggs = {
    requests: {
      filter: { term: { [SPAN_SUBTYPE]: 'http' } },
      aggs: {
        requestsByLocation: {
          terms: {
            field: locationField,
          },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_mobile_location_http_requests', {
    apm: {
      events: [ProcessorEvent.span],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(SPAN_TYPE, 'external'),
            ...rangeQuery(startWithOffset, endWithOffset),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
        },
      },
      aggs: {
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
          },
          aggs,
        },
        ...aggs,
      },
    },
  });

  return {
    location: response.aggregations?.requests?.requestsByLocation?.buckets[0]?.key as string,
    value: response.aggregations?.requests?.requestsByLocation?.buckets[0]?.doc_count ?? 0,
    timeseries:
      response.aggregations?.timeseries?.buckets.map((bucket) => ({
        x: bucket.key,
        y: bucket?.requests?.requestsByLocation?.buckets[0]?.doc_count ?? 0,
      })) ?? [],
  };
}
