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
  SESSION_ID,
  SERVICE_TARGET_TYPE,
  EVENT_NAME,
  CLIENT_GEO_COUNTRY_NAME,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getBucketSize } from '../../lib/helpers/get_bucket_size';

type Timeseries = Array<{ x: number; y: number }>;

export interface MobileLocationStats {
  mostSessions: {
    location?: string | number;
    value?: number;
    timeseries: Timeseries;
  };
  mostRequests: {
    location?: string | number;
    value?: number;
    timeseries: Timeseries;
  };
  mostCrashes: {
    location?: string | number;
    value?: number;
    timeseries: Timeseries;
  };
}

export async function getMobileLocationStats({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  locationField = CLIENT_GEO_COUNTRY_NAME,
}: {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
  locationField?: string;
}): Promise<MobileLocationStats> {
  const { intervalString } = getBucketSize({
    start,
    end,
    minBucketSize: 60,
  });

  const aggs = {
    sessions: {
      terms: {
        field: locationField,
      },
      aggs: {
        sessions: {
          cardinality: { field: SESSION_ID },
        },
      },
    },
    requests: {
      filter: { term: { [SERVICE_TARGET_TYPE]: 'http' } },
      aggs: {
        requestsByLocation: {
          terms: {
            field: locationField,
          },
        },
      },
    },
    crashCount: {
      filter: { term: { [EVENT_NAME]: 'crash' } },
      aggs: {
        crashesByLocation: {
          terms: {
            field: locationField,
          },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_mobile_location_stats', {
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

  return {
    mostSessions: {
      location: response.aggregations?.sessions?.buckets[0]?.key,
      value: response.aggregations?.sessions?.buckets[0]?.sessions.value ?? 0,
      timeseries:
        response.aggregations?.timeseries?.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.sessions.buckets[0].sessions.value ?? 0,
        })) ?? [],
    },
    mostRequests: {
      location:
        response.aggregations?.requests?.requestsByLocation?.buckets[0]?.key,
      value:
        response.aggregations?.requests?.requestsByLocation?.buckets[0]
          ?.doc_count ?? 0,
      timeseries:
        response.aggregations?.timeseries?.buckets.map((bucket) => ({
          x: bucket.key,
          y:
            response.aggregations?.requests?.requestsByLocation?.buckets[0]
              ?.doc_count ?? 0,
        })) ?? [],
    },
    mostCrashes: {
      location:
        response.aggregations?.crashCount?.crashesByLocation?.buckets[0]?.key,
      value:
        response.aggregations?.crashCount?.crashesByLocation?.buckets[0]
          ?.doc_count ?? 0,
      timeseries:
        response.aggregations?.timeseries?.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.crashCount.crashesByLocation.buckets[0]?.doc_count ?? 0,
        })) ?? [],
    },
  };
}
