/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { sortBy, take, uniq } from 'lodash';
import { existsQuery, kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  OTEL_SPAN_LINKS_SPAN_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_LINKS,
  SPAN_NAME,
  TRACE_ID,
  TRANSACTION_NAME,
} from '../../../common/es_fields/apm';
import { SERVICE_MAP_TIMEOUT_ERROR } from '../../../common/service_map';
import { environmentQuery } from '../../../common/utils/environment_query';

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { APMConfig } from '../..';

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

  const fingerprintBucketSize = isUnfilteredGlobalServiceMap
    ? config.serviceMapFingerprintGlobalBucketSize
    : config.serviceMapFingerprintBucketSize;

  const traceIdBucketSize = isUnfilteredGlobalServiceMap
    ? config.serviceMapTraceIdGlobalBucketSize
    : config.serviceMapTraceIdBucketSize;

  const samplerShardSize = traceIdBucketSize * 10;

  try {
    const searches = getQueries({
      query,
      samplerShardSize,
      fingerprintBucketSize,
      isUnfilteredGlobalServiceMap,
      traceIdBucketSize,
    });

    const tracesSampleResponse = (
      await apmEventClient.msearch(
        'get_trace_sample_ids',
        ...(isUnfilteredGlobalServiceMap
          ? [searches.traceSampleIds, searches.traceSampleIdsForSpanLinks]
          : [searches.traceSampleIds])
      )
    ).responses;

    const samples = tracesSampleResponse.flatMap(
      (response) => response.aggregations?.connections.buckets.map((p) => p.sample) ?? []
    );
    // make sure at least one trace per composite/connection bucket is queried
    const traceIdsWithPriority = samples.flatMap((sample) =>
      sample.trace_ids.buckets.map((sampleDocBucket, index) => ({
        traceId: sampleDocBucket.key as string,
        priority: index,
      }))
    );

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

function getQueries({
  query,
  fingerprintBucketSize,
  samplerShardSize,
  traceIdBucketSize,
  isUnfilteredGlobalServiceMap,
}: {
  query: {
    bool: {
      filter: QueryDslQueryContainer[];
    };
  };
  fingerprintBucketSize: number;
  samplerShardSize: number;
  traceIdBucketSize: number;
  isUnfilteredGlobalServiceMap: boolean;
}) {
  return {
    traceSampleIds: getFetchTraceSampleIdsParams({
      fingerprintBucketSize,
      isUnfilteredGlobalServiceMap,
      query,
      samplerShardSize,
      traceIdBucketSize,
    }),
    traceSampleIdsForSpanLinks: getSampleTraceIdsForSpanLinksParams({
      query,
      fingerprintBucketSize,
      samplerShardSize,
      traceIdBucketSize,
    }),
  };
}

function getFetchTraceSampleIdsParams({
  query,
  fingerprintBucketSize,
  samplerShardSize,
  traceIdBucketSize,
  isUnfilteredGlobalServiceMap,
}: {
  query: {
    bool: {
      filter: QueryDslQueryContainer[];
    };
  };
  fingerprintBucketSize: number;
  samplerShardSize: number;
  traceIdBucketSize: number;
  isUnfilteredGlobalServiceMap: boolean;
}) {
  return {
    apm: {
      // perf optimization that is only possible on the global service map with no filters
      events: isUnfilteredGlobalServiceMap
        ? [ProcessorEvent.span]
        : [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...query.bool.filter,
          ...(isUnfilteredGlobalServiceMap ? existsQuery(SPAN_DESTINATION_SERVICE_RESOURCE) : []),
        ],
      },
    },
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
        aggs: getAggregation({ samplerShardSize, traceIdBucketSize }),
      },
    },
  };
}

function getSampleTraceIdsForSpanLinksParams({
  query,
  fingerprintBucketSize,
  samplerShardSize,
  traceIdBucketSize,
}: {
  query: {
    bool: {
      filter: QueryDslQueryContainer[];
    };
  };
  fingerprintBucketSize: number;
  samplerShardSize: number;
  traceIdBucketSize: number;
}) {
  return {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...query.bool.filter,
          {
            bool: {
              should: [...existsQuery(SPAN_LINKS), ...existsQuery(OTEL_SPAN_LINKS_SPAN_ID)],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    aggs: {
      connections: {
        composite: {
          sources: asMutableArray([
            // span.name and transaction.name are the same in otel
            // elastic apm will have either span.name or transaction.name, depending on the event type
            {
              [SPAN_NAME]: {
                terms: {
                  field: SPAN_NAME,
                  missing_bucket: true,
                },
              },
            },
            {
              [TRANSACTION_NAME]: {
                terms: {
                  field: TRANSACTION_NAME,
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
        aggs: getAggregation({ samplerShardSize, traceIdBucketSize }),
      },
    },
  };
}

function getAggregation({
  samplerShardSize,
  traceIdBucketSize,
}: {
  samplerShardSize: number;
  traceIdBucketSize: number;
}) {
  return {
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
  };
}
