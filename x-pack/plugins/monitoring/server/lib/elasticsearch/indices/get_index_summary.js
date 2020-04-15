/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../../error_missing_required';
import { createQuery } from '../../create_query';
import { ElasticsearchMetric } from '../../metrics';
import { i18n } from '@kbn/i18n';

export function handleResponse(shardStats, indexUuid) {
  return response => {
    const indexStats = get(response, 'hits.hits[0]._source.index_stats');
    const primaries = get(indexStats, 'primaries');
    const total = get(indexStats, 'total');

    const stats = {
      documents: get(primaries, 'docs.count'),
      dataSize: {
        primaries: get(primaries, 'store.size_in_bytes'),
        total: get(total, 'store.size_in_bytes'),
      },
    };

    let indexSummary = {};
    const _shardStats = get(shardStats, ['indices', indexUuid]);
    if (_shardStats) {
      const unassigned = _shardStats.unassigned;
      const unassignedShards = get(unassigned, 'primary', 0) + get(unassigned, 'replica', 0);
      indexSummary = {
        unassignedShards,
        totalShards:
          get(_shardStats, 'primary', 0) + get(_shardStats, 'replica', 0) + unassignedShards,
        status:
          _shardStats.status ||
          i18n.translate('xpack.monitoring.es.indices.unknownStatusLabel', {
            defaultMessage: 'Unknown',
          }),
      };
    } else {
      indexSummary = {
        status: i18n.translate('xpack.monitoring.es.indices.notAvailableStatusLabel', {
          defaultMessage: 'Not Available',
        }),
      };
    }

    return {
      ...stats,
      ...indexSummary,
    };
  };
}

export function getIndexSummary(
  req,
  esIndexPattern,
  shardStats,
  { clusterUuid, indexUuid, start, end }
) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getIndexSummary');

  const metric = ElasticsearchMetric.getMetricFields();
  const filters = [{ term: { 'index_stats.index': indexUuid } }];
  const params = {
    index: esIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    body: {
      sort: { timestamp: { order: 'desc' } },
      query: createQuery({ type: 'index_stats', start, end, clusterUuid, metric, filters }),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse(shardStats, indexUuid));
}
