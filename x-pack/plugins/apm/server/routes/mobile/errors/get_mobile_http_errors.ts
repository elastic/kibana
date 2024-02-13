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
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  SERVICE_NAME,
  HTTP_RESPONSE_STATUS_CODE,
} from '../../../../common/es_fields/apm';
import { offsetPreviousPeriodCoordinates } from '../../../../common/utils/offset_previous_period_coordinate';
import { Coordinate } from '../../../../typings/timeseries';
import { BUCKET_TARGET_COUNT } from '../../transactions/constants';

interface Props {
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
  kuery: string;
  offset?: string;
}

function getBucketSize({ start, end }: { start: number; end: number }) {
  return Math.floor((end - start) / BUCKET_TARGET_COUNT);
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
}: Props) {
  const bucketSize = getBucketSize({
    start,
    end,
  });
  const response = await apmEventClient.search('get_mobile_http_errors', {
    apm: { events: [ProcessorEvent.error] },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...environmentQuery(environment),
            ...rangeQuery(start, end),
            ...rangeQuery(400, 599, HTTP_RESPONSE_STATUS_CODE),
            ...kqlQuery(kuery),
          ],
          must_not: {
            term: { 'error.type': 'crash' },
          },
        },
      },
      aggs: {
        timeseries: {
          histogram: {
            field: '@timestamp',
            min_doc_count: 0,
            interval: bucketSize,
            extended_bounds: {
              min: start,
              max: end,
            },
          },
        },
      },
    },
  });

  const timeseries = (response?.aggregations?.timeseries.buckets || []).map(
    (bucket) => ({
      x: bucket.key,
      y: bucket.doc_count,
    })
  );
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
  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const currentPeriodPromise = getMobileHttpErrorsTimeseries({
    ...options,
    start,
    end,
  });
  const previousPeriodPromise = offset
    ? getMobileHttpErrorsTimeseries({
        ...options,
        start: startWithOffset,
        end: endWithOffset,
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
