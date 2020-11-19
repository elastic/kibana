/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { LegacyAPICaller } from 'src/core/server';
import { MonitoringConfig } from '../../../config';
// @ts-ignore
import { prefixIndexPattern } from '../../../lib/ccs_utils';
import { StackProductUsage } from '../types';

interface ESResponse {
  aggregations?: {
    uuids: {
      buckets: UuidBucket[];
    };
  };
}

interface UuidBucket {
  key: string;
  indices: {
    buckets: KeyBucket[];
  };
}

interface KeyBucket {
  key: string;
}

export async function fetchStackProductUsage(
  config: MonitoringConfig,
  callCluster: LegacyAPICaller,
  clusterUuid: string,
  index: string,
  type: string,
  uuidPath: string,
  filters: any[] = []
): Promise<StackProductUsage> {
  const size = config.ui.max_bucket_size;
  const params = {
    index,
    size: 0,
    ignoreUnavailable: true,
    filterPath: ['aggregations.uuids.buckets'],
    body: {
      query: {
        bool: {
          must: [
            {
              term: {
                type: {
                  value: type,
                },
              },
            },
            {
              term: {
                cluster_uuid: {
                  value: clusterUuid,
                },
              },
            },
            {
              range: {
                timestamp: {
                  gte: 'now-1h',
                },
              },
            },
            ...filters,
          ],
        },
      },
      aggs: {
        uuids: {
          terms: {
            field: uuidPath,
            size,
          },
          aggs: {
            indices: {
              terms: {
                field: '_index',
                size: 2,
              },
            },
          },
        },
      },
    },
  };

  const response = (await callCluster('search', params)) as ESResponse;
  const uuidBuckets = get(response, 'aggregations.uuids.buckets', []) as UuidBucket[];
  const count = uuidBuckets.length;
  const metricbeatUsed = Boolean(
    uuidBuckets.find((uuidBucket) =>
      (get(uuidBucket, 'indices.buckets', []) as KeyBucket[]).find((indexBucket) =>
        indexBucket.key.includes('-mb-')
      )
    )
  );
  return {
    count,
    enabled: count > 0,
    metricbeatUsed,
  };
}
