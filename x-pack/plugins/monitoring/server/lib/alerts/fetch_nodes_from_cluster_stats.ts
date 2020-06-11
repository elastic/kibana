/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCluster, AlertClusterStatsNodes } from '../../alerts/types';

interface ClusterStateNodesESResponse {
  [nodeUuid: string]: {
    name: string;
    ephemeral_id: string;
  };
}

function formatNode(nodes: ClusterStateNodesESResponse) {
  return Object.keys(nodes).map((nodeUuid) => {
    return {
      nodeUuid,
      nodeEphemeralId: nodes[nodeUuid].ephemeral_id,
      nodeName: nodes[nodeUuid].name,
    };
  });
}

export async function fetchNodesFromClusterStats(
  callCluster: any,
  clusters: AlertCluster[],
  index: string
): Promise<AlertClusterStatsNodes[]> {
  return await Promise.all(
    clusters.map(async (cluster) => {
      const params = {
        index,
        filterPath: [
          'hits.hits._source.cluster_state.nodes',
          'hits.hits._source.cluster_uuid',
          'hits.hits._index',
        ],
        body: {
          size: 2,
          sort: [
            {
              timestamp: {
                order: 'desc',
              },
            },
          ],
          query: {
            bool: {
              filter: [
                {
                  term: {
                    cluster_uuid: cluster.clusterUuid,
                  },
                },
                {
                  term: {
                    type: 'cluster_stats',
                  },
                },
                {
                  range: {
                    timestamp: {
                      gte: 'now-2d',
                    },
                  },
                },
              ],
            },
          },
        },
      };

      const response = await callCluster('search', params);
      const hits = get(response, 'hits.hits', []);
      const indexName = get(hits[0], '_index', '');
      return {
        clusterUuid: get(hits[0], '_source.cluster_uuid', ''),
        recentNodes: formatNode(get(hits[0], '_source.cluster_state.nodes')),
        priorNodes: formatNode(get(hits[1], '_source.cluster_state.nodes')),
        ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
      };
    })
  );
}
