/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { AlertCluster, AlertRuleFailuresStats } from '../../../common/types/alerts';
import { createDatasetFilter } from './create_dataset_query_filter';
import { getIndexPatterns, getKibanaDataset } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';
import { CCS_REMOTE_PATTERN } from '../../../common/constants';

interface NodeBucketESResponse {
  key: string;
  average_cpu: { value: number };
}

interface ClusterBucketESResponse {
  key: string;
  indices: {
    buckets: NodeBucketESResponse[];
  };
}

export async function fetchKibanaNodeRules(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  startMs: number,
  endMs: number,
  size: number,
  filterQuery?: string
): Promise<AlertRuleFailuresStats[]> {
  const indexPatterns = getIndexPatterns({
    config: Globals.app.config,
    moduleType: 'kibana',
    dataset: 'node_rules',
    ccs: CCS_REMOTE_PATTERN,
  });
  
  const params = {
    index: indexPatterns,
    filter_path: ['aggregations'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                cluster_uuid: clusters.map((cluster) => cluster.clusterUuid),
              },
            },
            createDatasetFilter('node_rules', 'node_rules', getKibanaDataset('node_rules')),
            {
              range: {
                timestamp: {
                  format: 'epoch_millis',
                  gte: startMs,
                  lte: endMs,
                },
              },
            },
          ],
        },
      },
      aggs: {
        clusters: {
          terms: {
            field: 'cluster_uuid',
            size,
            include: clusters.map((cluster) => cluster.clusterUuid),
          },
          aggs: {
            indices: {
              terms: {
                field: '_index',
                size: 1,
              },
            },
            executions: {
              max: {
                field: 'kibana.node_rules.executions',
              },
            },
            failures: {
              max: {
                field: 'kibana.node_rules.failures',
              },
            },
          },
        },
      },
    },
  };

  try {
    if (filterQuery) {
      const filterQueryObject = JSON.parse(filterQuery);
      params.body.query.bool.filter.push(filterQueryObject);
    }
  } catch (e) {
    // meh
  }

  const response = await esClient.search(params);
  
  const stats: AlertRuleFailuresStats[] = [];
  const clusterBuckets = get(
    response,
    'aggregations.clusters.buckets',
    []
  ) as ClusterBucketESResponse[];
  for (const clusterBucket of clusterBuckets) {
    const indices = clusterBucket.indices.buckets;
    // This means they are only using internal monitoring and rule monitoring data is not available
    if (indices.length === 0) {
      break;
    }

    const stat = {
      failures: get(clusterBucket, 'failures.value', 0),
      executions: get(clusterBucket, 'executions.value', 0),
      clusterUuid: clusterBucket.key,
    };

    stats.push(stat);
  }
  return stats;
}
