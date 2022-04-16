/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { AlertCluster, AlertVersions } from '../../../common/types/alerts';
import { createDatasetFilter } from './create_dataset_query_filter';
import { Globals } from '../../static_globals';
import { getConfigCcs } from '../../../common/ccs_utils';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';

interface ESAggResponse {
  key: string;
}

export async function fetchKibanaVersions(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  size: number,
  filterQuery?: string
): Promise<AlertVersions[]> {
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'kibana',
    dataset: 'stats',
    ccs: getConfigCcs(Globals.app.config) ? '*' : undefined,
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
            createDatasetFilter('kibana_stats', 'stats', 'kibana.stats'),
            {
              range: {
                timestamp: {
                  gte: 'now-2m',
                },
              },
            },
          ],
        },
      },
      aggs: {
        index: {
          terms: {
            field: '_index',
            size: 1,
          },
        },
        cluster: {
          terms: {
            field: 'cluster_uuid',
            size: 1,
          },
          aggs: {
            group_by_kibana: {
              terms: {
                field: 'kibana_stats.kibana.uuid',
                size,
              },
              aggs: {
                group_by_version: {
                  terms: {
                    field: 'kibana_stats.kibana.version',
                    size: 1,
                    order: {
                      latest_report: 'desc' as const,
                    },
                  },
                  aggs: {
                    latest_report: {
                      max: {
                        field: 'timestamp',
                      },
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
    if (filterQuery) {
      const filterQueryObject = JSON.parse(filterQuery);
      params.body.query.bool.filter.push(filterQueryObject);
    }
  } catch (e) {
    // meh
  }

  const response = await esClient.search(params);
  const indexName = get(response, 'aggregations.index.buckets[0].key', '');
  const clusterList = get(response, 'aggregations.cluster.buckets', []) as ESAggResponse[];
  return clusterList.map((cluster) => {
    const clusterUuid = cluster.key;
    const uuids = get(cluster, 'group_by_kibana.buckets', []);
    const byVersion: { [version: string]: boolean } = {};
    for (const uuid of uuids) {
      const version = get(uuid, 'group_by_version.buckets[0].key', '');
      if (!version) {
        continue;
      }
      byVersion[version] = true;
    }
    return {
      versions: Object.keys(byVersion),
      clusterUuid,
      ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
    };
  });
}
