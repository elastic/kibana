/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import { getBucketSize } from '../../../../common/utils/get_bucket_size';
import { environmentQuery } from '../../../../common/utils/environment_query';

import { SERVICE_NAME, SPAN_SUBTYPE } from '../../../../common/es_fields/apm';
import { offsetPreviousPeriodCoordinates } from '../../../../common/utils/offset_previous_period_coordinate';
import { Coordinate } from '../../../../typings/timeseries';

interface Props {
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
  kuery: string;
  offset?: string;
}

export interface MobileHttpErrorsTimeseries {
  currentPeriod: { timeseries: Coordinate[] };
  previousPeriod: { timeseries: Coordinate[] };
}
async function getMobileHttpErrorsTimeseries({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
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
    httpErrors: {
      filter: {
        range: {
          'http.response.status_code': {
            gte: 400,
          },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_mobile_http_errors', {
    apm: { events: [ProcessorEvent.span] },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(SPAN_SUBTYPE, 'http'),
            ...environmentQuery(environment),
            ...rangeQuery(startWithOffset, endWithOffset),
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
            extended_bounds: { min: startWithOffset, max: endWithOffset },
          },
          aggs,
        },
      },
    },
  });

  const timeseries =
    response?.aggregations?.timeseries.buckets.reduce((prev, bucket) => {
      const time = bucket.key;
      prev.push({ x: time, y: bucket.doc_count });
      return prev;
    }, [] as Coordinate[]) ?? [];
  return { timeseries };
}

export async function getMobileHttpErrors({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  offset,
}: Props): Promise<MobileHttpErrorsTimeseries> {
  const options = {
    serviceName,
    apmEventClient,
    kuery,
    environment,
  };
  const currentPeriodPromise = getMobileHttpErrorsTimeseries({
    ...options,
    start,
    end,
  });
  const previousPeriodPromise = offset
    ? getMobileHttpErrorsTimeseries({
        ...options,
        start,
        end,
        offset,
      })
    : { timeseries: [] as Coordinate[] };
  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);
  return {
    currentPeriod,
    previousPeriod: {
      timeseries: offsetPreviousPeriodCoordinates({
        currentPeriodTimeseries: currentPeriod.timeseries,
        previousPeriodTimeseries: previousPeriod.timeseries,
      }),
    },
  };
}
