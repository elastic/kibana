/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq, take, sortBy } from 'lodash';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { rangeFilter } from '../../../common/utils/range_filter';
import { ESFilter } from '../../../typings/elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRACE_ID,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../../../common/elasticsearch_fieldnames';

const MAX_TRACES_TO_INSPECT = 1000;

export async function getTraceSampleIds({
  serviceName,
  environment,
  setup,
}: {
  serviceName?: string;
  environment?: string;
  setup: Setup & SetupTimeRange;
}) {
  const { start, end, client, indices, config } = setup;

  const rangeQuery = { range: rangeFilter(start, end) };

  const query = {
    bool: {
      filter: [
        {
          term: {
            [PROCESSOR_EVENT]: 'span',
          },
        },
        {
          exists: {
            field: SPAN_DESTINATION_SERVICE_RESOURCE,
          },
        },
        rangeQuery,
      ] as ESFilter[],
    },
  } as { bool: { filter: ESFilter[]; must_not?: ESFilter[] | ESFilter } };

  if (serviceName) {
    query.bool.filter.push({ term: { [SERVICE_NAME]: serviceName } });
  }

  if (environment) {
    query.bool.filter.push({ term: { [SERVICE_ENVIRONMENT]: environment } });
  }

  const fingerprintBucketSize = serviceName
    ? config['xpack.apm.serviceMapFingerprintBucketSize']
    : config['xpack.apm.serviceMapFingerprintGlobalBucketSize'];

  const traceIdBucketSize = serviceName
    ? config['xpack.apm.serviceMapTraceIdBucketSize']
    : config['xpack.apm.serviceMapTraceIdGlobalBucketSize'];

  const samplerShardSize = traceIdBucketSize * 10;

  const params = {
    index: [indices['apm_oss.spanIndices']],
    body: {
      size: 0,
      query,
      aggs: {
        connections: {
          composite: {
            sources: [
              {
                [SPAN_DESTINATION_SERVICE_RESOURCE]: {
                  terms: {
                    field: SPAN_DESTINATION_SERVICE_RESOURCE,
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
            ],
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

  const tracesSampleResponse = await client.search<unknown, typeof params>(
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

  return {
    traceIds,
  };
}
