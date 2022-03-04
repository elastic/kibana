/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ElasticsearchClient } from 'src/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MonitoringConfig } from '../../../config';
// @ts-ignore
import { prefixIndexPattern } from '../../../../common/ccs_utils';
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
  callCluster: ElasticsearchClient,
  clusterUuid: string,
  index: string,
  type: string,
  uuidPath: string,
  filters: any[] = []
): Promise<StackProductUsage> {
  const size = config.ui.max_bucket_size;
  const params: estypes.SearchRequest = {
    index,
    size: 0,
    ignore_unavailable: true,
    filter_path: ['aggregations.uuids.buckets'],
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

  const responseBody = await callCluster.search(params);
  const response = responseBody as estypes.SearchResponse<ESResponse>;
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
