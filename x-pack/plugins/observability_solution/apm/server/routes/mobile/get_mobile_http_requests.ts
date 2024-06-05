/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '../../../common/es_fields/apm';
import { MobileSpanSubtype, MobileSpanType } from '../../../common/mobile/constants';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import { Maybe } from '../../../typings/common';

import { Coordinate } from '../../../typings/timeseries';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export interface HttpRequestsTimeseries {
  currentPeriod: { timeseries: Coordinate[]; value: Maybe<number> };
  previousPeriod: { timeseries: Coordinate[]; value: Maybe<number> };
}
interface Props {
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionName?: string;
  environment: string;
  start: number;
  end: number;
  kuery: string;
  offset?: string;
}

async function getHttpRequestsTimeseries({
  kuery,
  apmEventClient,
  serviceName,
  transactionName,
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
    requests: {
      filter: { term: { [SPAN_SUBTYPE]: MobileSpanSubtype.Http } },
    },
  };

  const response = await apmEventClient.search('get_http_requests_chart', {
    apm: { events: [ProcessorEvent.span] },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SPAN_TYPE, MobileSpanType.External),
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(SPAN_TYPE, 'external'),
            ...termQuery(TRANSACTION_NAME, transactionName),
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
            extended_bounds: { min: startWithOffset, max: endWithOffset },
          },
          aggs,
        },
        ...aggs,
      },
    },
  });

  const timeseries =
    response?.aggregations?.timeseries.buckets.map((bucket) => {
      return {
        x: bucket.key,
        y: bucket.requests.doc_count,
      };
    }) ?? [];

  return {
    timeseries,
    value: response.aggregations?.requests?.doc_count,
  };
}

export async function getMobileHttpRequests({
  kuery,
  apmEventClient,
  serviceName,
  transactionName,
  environment,
  start,
  end,
  offset,
}: Props): Promise<HttpRequestsTimeseries> {
  const options = {
    serviceName,
    transactionName,
    apmEventClient,
    kuery,
    environment,
  };

  const currentPeriodPromise = getHttpRequestsTimeseries({
    ...options,
    start,
    end,
  });

  const previousPeriodPromise = offset
    ? getHttpRequestsTimeseries({
        ...options,
        start,
        end,
        offset,
      })
    : { timeseries: [], value: null };

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
      value: previousPeriod?.value,
    },
  };
}
