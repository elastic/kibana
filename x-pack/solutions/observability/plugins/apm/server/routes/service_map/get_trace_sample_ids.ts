/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { sortBy, take, uniq } from 'lodash';
import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TRACE_ID,
} from '../../../common/es_fields/apm';
import { SERVICE_MAP_TIMEOUT_ERROR } from '../../../common/service_map';
import { environmentQuery } from '../../../common/utils/environment_query';

import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { APMConfig } from '../..';

export async function getTraceSampleIds({
  serviceName,
  environment,
  config,
  apmEventClient,
  start,
  end,
  serviceGroupKuery,
  kuery,
}: {
  serviceName?: string;
  environment: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceGroupKuery?: string;
  kuery?: string;
}) {
  const query = {
    bool: {
      filter: [
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        ...kqlQuery(serviceGroupKuery),
        ...kqlQuery(kuery),
        ...termQuery(SERVICE_NAME, serviceName),
      ],
    },
  };

  const isUnfilteredGlobalServiceMap = !serviceName && !serviceGroupKuery && !kuery;
  let events = [ProcessorEvent.span, ProcessorEvent.transaction];

  // perf optimization that is only possible on the global service map with no filters
  if (isUnfilteredGlobalServiceMap) {
    events = [ProcessorEvent.span];
    query.bool.filter.push({
      exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE },
    });
  }

  const fingerprintBucketSize = isUnfilteredGlobalServiceMap
    ? config.serviceMapFingerprintGlobalBucketSize
    : config.serviceMapFingerprintBucketSize;

  const traceIdBucketSize = isUnfilteredGlobalServiceMap
    ? config.serviceMapTraceIdGlobalBucketSize
    : config.serviceMapTraceIdBucketSize;

  const samplerShardSize = traceIdBucketSize * 10;

  const params = {
    apm: {
      events,
    },
    body: {
      track_total_hits: false,
      size: 0,
      query,
      aggs: {
        connections: {
          composite: {
            sources: asMutableArray([
              {
                [SPAN_DESTINATION_SERVICE_RESOURCE]: {
                  terms: {
                    field: SPAN_DESTINATION_SERVICE_RESOURCE,
                    missing_bucket: true,
                  },
                },
              },
              {
                [SERVICE_NAME]: {
                  terms: {
                    field: SERVICE_NAME,
                  },
                },
              },
              {
                [SERVICE_ENVIRONMENT]: {
                  terms: {
                    field: SERVICE_ENVIRONMENT,
                    missing_bucket: true,
                  },
                },
              },
            ] as const),
            size: fingerprintBucketSize,
          },
          aggs: {
            sample: {
              sampler: {
                shard_size: samplerShardSize,
              },
              aggs: {
                trace_ids: {
                  terms: {
                    field: TRACE_ID,
                    size: traceIdBucketSize,
                    execution_hint: 'map' as const,
                    // remove bias towards large traces by sorting on trace.id
                    // which will be random-esque
                    order: {
                      _key: 'desc' as const,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  try {
    const tracesSampleResponse = await apmEventClient.search('get_trace_sample_ids', params);
    // make sure at least one trace per composite/connection bucket is queried
    const traceIdsWithPriority =
      tracesSampleResponse.aggregations?.connections.buckets.flatMap((bucket) =>
        bucket.sample.trace_ids.buckets.map((sampleDocBucket, index) => ({
          traceId: sampleDocBucket.key as string,
          priority: index,
        }))
      ) || [];

    const traceIds = take(
      uniq(sortBy(traceIdsWithPriority, 'priority').map(({ traceId }) => traceId)),
      config.serviceMapMaxTraces
    );

    return { traceIds };
  } catch (error) {
    if ('displayName' in error && error.displayName === 'RequestTimeout') {
      throw Boom.internal(SERVICE_MAP_TIMEOUT_ERROR);
    }
    throw error;
  }
}
