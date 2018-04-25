/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../../error_missing_required';
import { createQuery } from '../../create_query';
import { ElasticsearchMetric } from '../../metrics';

export function handleResponse(nodeResolver) {
  return response => {
    const hits = get(response, 'hits.hits');
    if (!hits) {
      return [];
    }

    // map into object with shard and source properties
    return hits.map(hit => {
      return {
        ...hit._source.shard,
        resolver: get(hit, `_source.source_node[${nodeResolver}]`)
      };
    });
  };
}

export function getShardAllocation(req, esIndexPattern, { nodeResolver, shardFilter, stateUuid, showSystemIndices = false }) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getShardAllocation');

  const filters = [ { term: { state_uuid: stateUuid } }, shardFilter ];
  if (!showSystemIndices) {
    filters.push({
      bool: { must_not: [
        { prefix: { 'shard.index': '.' } }
      ] }
    });
  }

  const config = req.server.config();
  const clusterUuid = req.params.clusterUuid;
  const metric = ElasticsearchMetric.getMetricFields();
  const params = {
    index: esIndexPattern,
    size: config.get('xpack.monitoring.max_bucket_size'),
    ignoreUnavailable: true,
    body: {
      query: createQuery({ type: 'shards', clusterUuid, metric, filters })
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params)
    .then(handleResponse(nodeResolver));
}
