/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
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
  version: {
    buckets: KeyBucket[];
  };
  index: {
    buckets: KeyBucket[];
  };
}

interface KeyBucket {
  key: string;
}

export async function fetchStackProductUsage(
  config: MonitoringConfig,
  callCluster: CallCluster,
  clusterUuid: string,
  indexPattern: string,
  productName: string,
  type: string,
  uuidPath: string,
  versionPath: string
): Promise<StackProductUsage> {
  const size = config.ui.max_bucket_size;
  const index = prefixIndexPattern(config, indexPattern, '*');
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
            version: {
              terms: {
                field: versionPath,
                size: 1,
              },
            },
            index: {
              terms: {
                field: '_index',
                size: 1,
              },
            },
          },
        },
      },
    },
  };

  const response = (await callCluster('search', params)) as ESResponse;
  if (!response.aggregations) {
    return {
      productName,
      clusterUuid,
      count: 0,
      mbCount: 0,
      versions: [],
    };
  }

  const mbCount = response.aggregations.uuids.buckets.reduce((accum: number, uuidBucket) => {
    return (
      accum +
      uuidBucket.index.buckets.reduce((count: number, indexBucket) => {
        if (indexBucket.key.includes('-mb-')) {
          count++;
        }
        return count;
      }, 0)
    );
  }, 0);

  const versions = response.aggregations.uuids.buckets.reduce((accum: string[], uuidBucket) => {
    return [...accum, ...uuidBucket.version.buckets.map((versionBucket) => versionBucket.key)];
  }, []);

  return {
    productName,
    count: response.aggregations.uuids.buckets.length,
    versions,
    mbCount,
    clusterUuid,
  };
}
