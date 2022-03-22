/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUndefined } from 'lodash';
import { getNodeIds } from './get_node_ids';
// @ts-ignore
import { filter } from '../../../pagination/filter';
import { sortNodes } from './sort_nodes';
// @ts-ignore
import { paginate } from '../../../pagination/paginate';
import { getMetrics } from '../../../details/get_metrics';
import { LegacyRequest } from '../../../../types';

/**
 * This function performs an optimization around the node listing tables in the UI. To avoid
 * query performances in Elasticsearch (mainly thinking of `search.max_buckets` overflows), we do
 * not want to fetch all time-series data for all nodes. Instead, we only want to fetch the
 * time-series data for the nodes visible in the listing table. This function accepts
 * pagination/sorting/filtering data to determine which nodes will be visible in the table
 * and returns that so the caller can perform their normal call to get the time-series data.
 *
 * @param {*} req - Server request object
 * @param {*} esIndexPattern - The index pattern to search against (`.monitoring-es-*`)
 * @param {*} uuids - The optional `clusterUuid` and `nodeUuid` to filter the results from
 * @param {*} metricSet - The array of metrics that are sortable in the UI
 * @param {*} pagination - ({ index, size })
 * @param {*} sort - ({ field, direction })
 * @param {*} queryText - Text that will be used to filter out pipelines
 */

interface Node {
  name: string;
  uuid: string;
  isOnline: boolean;
  shardCount: number;
}

export async function getPaginatedNodes(
  req: LegacyRequest,
  { clusterUuid }: { clusterUuid: string },
  metricSet: string[],
  pagination: { index: number; size: number },
  sort: { field: string; direction: 'asc' | 'desc' },
  queryText: string,
  {
    clusterStats,
    nodesShardCount,
  }: {
    clusterStats: {
      cluster_state?: { nodes: Record<string, Node> };
      elasticsearch?: {
        cluster: {
          stats: {
            state: { nodes: Record<string, Node> };
          };
        };
      };
    };
    nodesShardCount: { nodes: Record<string, { shardCount: number }> };
  }
) {
  const config = req.server.config;
  const size = config.ui.max_bucket_size;
  const nodes: Node[] = await getNodeIds(req, { clusterUuid }, size);

  // Add `isOnline` and shards from the cluster state and shard stats
  const clusterState = clusterStats?.cluster_state ??
    clusterStats?.elasticsearch?.cluster.stats.state ?? { nodes: {} };
  for (const node of nodes) {
    node.isOnline = !isUndefined(clusterState?.nodes[node.uuid]);
    node.shardCount = nodesShardCount?.nodes[node.uuid]?.shardCount ?? 0;
  }

  // `metricSet` defines a list of metrics that are sortable in the UI
  // but we don't need to fetch all the data for these metrics to perform
  // the necessary sort - we only need the last bucket of data so we
  // fetch the last two buckets of data (to ensure we have a single full bucekt),
  // then return the value from that last bucket
  const filters = [
    {
      terms: {
        'source_node.name': nodes.map((node) => node.name),
      },
    },
  ];
  const groupBy = {
    field: `source_node.uuid`,
    include: nodes.map((node) => node.uuid),
    size,
  };
  const metricSeriesData = await getMetrics(
    req,
    'elasticsearch',
    metricSet,
    filters,
    { nodes },
    4,
    groupBy
  );

  for (const metricName in metricSeriesData) {
    if (!metricSeriesData.hasOwnProperty(metricName)) {
      continue;
    }

    const metricList = metricSeriesData[metricName];
    for (const metricItem of metricList[0]) {
      const node = nodes.find((n) => n.uuid === metricItem.groupedBy);
      if (!node) {
        continue;
      }

      const dataSeries = metricItem.data;
      if (dataSeries && dataSeries.length) {
        const lastItem = dataSeries[dataSeries.length - 1];
        if (lastItem.length && lastItem.length === 2) {
          Reflect.set(node, metricName, lastItem[1]);
        }
      }
    }
  }

  // Manually apply pagination/sorting/filtering concerns

  // Filtering
  const filteredNodes = filter(nodes, queryText, ['name']); // We only support filtering by name right now

  // Sorting
  const sortedNodes = sortNodes(filteredNodes, sort);

  // Pagination
  const pageOfNodes = paginate(pagination, sortedNodes);

  return {
    pageOfNodes,
    totalNodeCount: filteredNodes.length,
  };
}
