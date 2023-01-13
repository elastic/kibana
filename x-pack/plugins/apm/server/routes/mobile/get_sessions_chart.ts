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
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import {
  SERVICE_NAME,
  SESSION_ID,
  TRANSACTION_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getBucketSize } from '../../lib/helpers/get_bucket_size';

interface Props {
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  environment: string;
  start: number;
  end: number;
  kuery: string;
  offset?: string;
}

async function getSessionTimeseries({
  apmEventClient,
  serviceName,
  transactionType,
  transactionName,
  environment,
  start,
  end,
  kuery,
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

  const response = await apmEventClient.search('get_sessions_chart', {
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.error,
        ProcessorEvent.span,
      ],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            { exists: { field: SESSION_ID } },
            ...termQuery(SERVICE_NAME, serviceName),
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
          aggs: {
            sessions: {
              cardinality: { field: SESSION_ID },
            },
          },
        },
      },
    },
  });

  return (
    response?.aggregations?.timeseries.buckets.map((bucket) => {
      return {
        x: bucket.key,
        y: bucket.doc_count ?? 0,
      };
    }) ?? []
  );
}

export async function getSessionsChart({
  kuery,
  apmEventClient,
  serviceName,
  transactionType,
  transactionName,
  environment,
  start,
  end,
  offset,
}: Props) {
  const options = {
    serviceName,
    transactionType,
    transactionName,
    apmEventClient,
    kuery,
    environment,
  };

  const currentPeriodPromise = getSessionTimeseries({
    ...options,
    start,
    end,
  });

  const previousPeriodPromise = offset
    ? getSessionTimeseries({
        ...options,
        start,
        end,
        offset,
      })
    : [];

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  return {
    currentPeriod,
    previousPeriod: offsetPreviousPeriodCoordinates({
      currentPeriodTimeseries: currentPeriod,
      previousPeriodTimeseries: previousPeriod,
    }),
  };
}
