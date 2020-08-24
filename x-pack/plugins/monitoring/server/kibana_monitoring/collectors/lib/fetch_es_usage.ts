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

export async function fetchESUsage(
  config: MonitoringConfig,
  callCluster: CallCluster,
  clusterUuid: string
): Promise<StackProductUsage> {
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
  const response = (await callCluster('search', params)) as ESResponse;
  const hit = response.hits.hits[0]._source;
  return {
    productName: ELASTICSEARCH_SYSTEM_ID,
    count: hit.cluster_stats.nodes.count.total,
    versions: [hit.version],
    clusterUuid,
  };
}
