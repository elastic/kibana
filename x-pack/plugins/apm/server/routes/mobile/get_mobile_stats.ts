/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  termQuery,
  kqlQuery,
  rangeQuery,
} from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SESSION_ID,
  SPAN_SUBTYPE,
  APP_LAUNCH_TIME,
  EVENT_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getBucketSize } from '../../lib/helpers/get_bucket_size';

type Timeseries = Array<{ x: number; y: number }>;
export interface MobileStats {
  sessions: { value?: number; timeseries: Timeseries };
  requests: { value?: number | null; timeseries: Timeseries };
  maxLoadTime: { value?: number | null; timeseries: Timeseries };
  crashCount: { value?: number | null; timeseries: Timeseries };
}

export async function getMobileStats({
  kuery,
  apmEventClient,
  serviceName,
  transactionType,
  environment,
  start,
  end,
}: {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionType?: string;
  environment: string;
  start: number;
  end: number;
}): Promise<MobileStats> {
  const { intervalString } = getBucketSize({
    start,
    end,
    minBucketSize: 60,
  });

  const aggs = {
    sessions: {
      cardinality: { field: SESSION_ID },
    },
    requests: {
      filter: { term: { [SPAN_SUBTYPE]: 'http' } },
    },
    maxLoadTime: {
      max: { field: APP_LAUNCH_TIME },
    },
    crashCount: {
      filter: { term: { [EVENT_NAME]: 'crash' } },
    },
  };

  const response = await apmEventClient.search('get_mobile_stats', {
    apm: {
      events: [
        ProcessorEvent.error,
        ProcessorEvent.metric,
        ProcessorEvent.transaction,
        ProcessorEvent.span,
      ],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...rangeQuery(start, end),
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

  const durationAsMinutes = (end - start) / 1000 / 60;

  return {
    sessions: {
      value: response.aggregations?.sessions?.value,
      timeseries:
        response.aggregations?.timeseries?.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.sessions.value ?? 0,
        })) ?? [],
    },
    requests: {
      value: response.aggregations?.requests?.doc_count,
      timeseries:
        response.aggregations?.timeseries?.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.requests.doc_count ?? 0,
        })) ?? [],
    },
    maxLoadTime: {
      value: response.aggregations?.maxLoadTime?.value,
      timeseries:
        response.aggregations?.timeseries?.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.maxLoadTime?.value ?? 0,
        })) ?? [],
    },
    crashCount: {
      value:
        response.aggregations?.crashCount?.doc_count ?? 0 / durationAsMinutes,
      timeseries:
        response.aggregations?.timeseries?.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.crashCount.doc_count ?? 0,
        })) ?? [],
    },
  };
}
