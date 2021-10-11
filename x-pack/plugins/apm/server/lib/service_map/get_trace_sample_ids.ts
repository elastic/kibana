/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { sortBy, take, uniq } from 'lodash';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TRACE_ID,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { SERVICE_MAP_TIMEOUT_ERROR } from '../../../common/service_map';
import { rangeQuery } from '../../../../observability/server';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Setup } from '../helpers/setup_request';

const MAX_TRACES_TO_INSPECT = 1000;

export async function getTraceSampleIds({
  serviceName,
  environment,
  setup,
  start,
  end,
}: {
  serviceName?: string;
  environment: string;
  setup: Setup;
  start: number;
  end: number;
}) {
  const { apmEventClient, config } = setup;

  const query = {
    bool: {
      filter: [...rangeQuery(start, end)],
    },
  };

  let events: ProcessorEvent[];

  if (serviceName) {
    query.bool.filter.push({ term: { [SERVICE_NAME]: serviceName } });
    events = [ProcessorEvent.span, ProcessorEvent.transaction];
  } else {
    events = [ProcessorEvent.span];
    query.bool.filter.push({
      exists: {
        field: SPAN_DESTINATION_SERVICE_RESOURCE,
      },
    });
  }

  query.bool.filter.push(...environmentQuery(environment));

  const fingerprintBucketSize = serviceName
    ? config['xpack.apm.serviceMapFingerprintBucketSize']
    : config['xpack.apm.serviceMapFingerprintGlobalBucketSize'];

  const traceIdBucketSize = serviceName
    ? config['xpack.apm.serviceMapTraceIdBucketSize']
    : config['xpack.apm.serviceMapTraceIdGlobalBucketSize'];

  const samplerShardSize = traceIdBucketSize * 10;

  const params = {
    apm: {
      events,
    },
    body: {
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
    const tracesSampleResponse = await apmEventClient.search(
      'get_trace_sample_ids',
      params
    );
    // make sure at least one trace per composite/connection bucket
    // is queried
    const traceIdsWithPriority =
      tracesSampleResponse.aggregations?.connections.buckets.flatMap((bucket) =>
        bucket.sample.trace_ids.buckets.map((sampleDocBucket, index) => ({
          traceId: sampleDocBucket.key as string,
          priority: index,
        }))
      ) || [];

    const traceIds = take(
      uniq(
        sortBy(traceIdsWithPriority, 'priority').map(({ traceId }) => traceId)
      ),
      MAX_TRACES_TO_INSPECT
    );

    return { traceIds };
  } catch (error) {
    if ('displayName' in error && error.displayName === 'RequestTimeout') {
      throw Boom.internal(SERVICE_MAP_TIMEOUT_ERROR);
    }
    throw error;
  }
}
