/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { MonitoringConfig } from '../../../config';
import { INDEX_PATTERN_ELASTICSEARCH, ELASTICSEARCH_SYSTEM_ID } from '../../../../common/constants';
// @ts-ignore
import { prefixIndexPattern } from '../../../lib/ccs_utils';
import { StackProductUsage } from '../types';

interface ESResponse {
  hits: {
    hits: ESResponseHits[];
  };
}

interface ESResponseHits {
  _source: ClusterStats;
}

interface ClusterStats {
  cluster_stats: {
    nodes: {
      count: {
        total: number;
      };
    };
  };
  version: string;
}

interface ESMBResponse {
  hits: {
    hits: ESMBResponseHits[];
  };
}

interface ESMBResponseHits {
  _index: string;
}

export async function fetchESUsage(
  config: MonitoringConfig,
  callCluster: CallCluster,
  clusterUuid: string
): Promise<StackProductUsage> {
  const size = config.ui.max_bucket_size;
  const index = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, '*');
  const params = {
    index,
    size: 1,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._source.cluster_stats.nodes.count.total', 'hits.hits._source.version'],
    body: {
      sort: [
        {
          timestamp: {
            order: 'desc',
          },
        },
      ],
      query: {
        bool: {
          must: [
            {
              term: {
                type: {
                  value: 'cluster_stats',
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
    },
  };

  const paramsForMbData = {
    index,
    size,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._index'],
    body: {
      query: {
        bool: {
          must: [
            {
              term: {
                type: {
                  value: 'node_stats',
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
      collapse: {
        field: 'node_stats.node_id',
      },
    },
  };

  const [response, mbResponse] = await Promise.all([
    await callCluster('search', params),
    await callCluster('search', paramsForMbData),
  ]);

  const hit = (response as ESResponse).hits.hits[0]._source;
  const mbCount = (mbResponse as ESMBResponse).hits.hits.reduce((accum: number, mbHit) => {
    if (mbHit._index.includes('-mb-')) {
      accum++;
    }
    return accum;
  }, 0);

  return {
    productName: ELASTICSEARCH_SYSTEM_ID,
    count: hit.cluster_stats.nodes.count.total,
    versions: [hit.version],
    clusterUuid,
    mbCount,
  };
}
