/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { MonitoringConfig } from '../../../config';
import { INDEX_PATTERN_KIBANA, KIBANA_SYSTEM_ID } from '../../../../common/constants';
// @ts-ignore
import { prefixIndexPattern } from '../../../lib/ccs_utils';
import { StackProductUsage } from '../types';

interface ESResponse {
  aggregations: {
    uuids: {
      buckets: UuidBucket[];
    };
  };
}

interface UuidBucket {
  key: string;
  version: {
    buckets: VersionBucket[];
  };
}

interface VersionBucket {
  key: string;
}

export async function fetchKibanaUsage(
  config: MonitoringConfig,
  callCluster: CallCluster,
  clusterUuid: string
): Promise<StackProductUsage> {
  const size = config.ui.max_bucket_size;
  const index = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, '*');
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
                  value: 'kibana_stats',
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
            field: 'kibana_stats.kibana.uuid',
            size,
          },
          aggs: {
            version: {
              terms: {
                field: 'kibana_stats.kibana.version',
                size: 1,
              },
            },
          },
        },
      },
    },
  };
  const response = (await callCluster('search', params)) as ESResponse;
  return {
    productName: KIBANA_SYSTEM_ID,
    count: response.aggregations.uuids.buckets.length,
    versions: response.aggregations.uuids.buckets.reduce((accum: string[], uuidBucket) => {
      return [...accum, ...uuidBucket.version.buckets.map((versionBucket) => versionBucket.key)];
    }, []),
    clusterUuid,
  };
}
