/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../../error_missing_required';
import { createQuery } from '../../create_query.js';
import { ElasticsearchMetric } from '../../metrics';

import { getDefaultNodeFromId } from './get_default_node_from_id';
import { calculateNodeType } from './calculate_node_type';
import { getNodeTypeClassLabel } from './get_node_type_class_label';

export function handleResponse(clusterState, shardStats, resolver) {
  return response => {
    let nodeSummary = {};
    const nodeStatsHits = get(response, 'hits.hits', []);
    const nodes = nodeStatsHits.map(hit => hit._source.source_node); // using [0] value because query results are sorted desc per timestamp
    const node = nodes[0] || getDefaultNodeFromId(resolver);
    const sourceStats = get(response, 'hits.hits[0]._source.node_stats');
    const clusterNode = get(clusterState, [ 'nodes', resolver ]);
    const stats = {
      resolver,
      node_ids: nodes.map(node => node.uuid),
      attributes: node.attributes,
      transport_address: node.transport_address,
      name: node.name,
      type: node.type,
    };

    if (clusterNode) {
      const _shardStats = get(shardStats, [ 'nodes', resolver ], {});
      const calculatedNodeType = calculateNodeType(stats, get(clusterState, 'master_node')); // set type for labeling / iconography
      const { nodeType, nodeTypeLabel, nodeTypeClass } = getNodeTypeClassLabel(node, calculatedNodeType);

      nodeSummary = {
        type: nodeType,
        nodeTypeLabel: nodeTypeLabel,
        nodeTypeClass: nodeTypeClass,
        totalShards: _shardStats.shardCount,
        indexCount: _shardStats.indexCount,
        documents: get(sourceStats, 'indices.docs.count'),
        dataSize: get(sourceStats, 'indices.store.size_in_bytes'),
        freeSpace: get(sourceStats, 'fs.total.available_in_bytes'),
        usedHeap: get(sourceStats, 'jvm.mem.heap_used_percent'),
        status: 'Online',
      };
    } else {
      nodeSummary = { nodeTypeLabel: 'Offline Node', status: 'Offline', };
    }

    return {
      ...stats,
      ...nodeSummary
    };
  };
}

export function getNodeSummary(req, esIndexPattern, clusterState, shardStats, { clusterUuid, resolver, start, end }) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getNodeSummary');

  // Get the params from the POST body for the request
  const config = req.server.config();

  // Build up the Elasticsearch request
  const resolverKey = config.get('xpack.monitoring.node_resolver');
  const metric = ElasticsearchMetric.getMetricFields();
  const filters = [{
    term: { [`source_node.${resolverKey}`]: resolver }
  }];
  const params = {
    index: esIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    body: {
      sort: { timestamp: { order: 'desc' } },
      query: createQuery({ type: 'node_stats', start, end, clusterUuid, metric, filters })
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params)
    .then(handleResponse(clusterState, shardStats, resolver));
}

