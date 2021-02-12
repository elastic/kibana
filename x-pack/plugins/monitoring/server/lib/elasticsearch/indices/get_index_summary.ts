/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { checkParam } from '../../error_missing_required';
// @ts-ignore
import { createQuery } from '../../create_query';
// @ts-ignore
import { ElasticsearchMetric } from '../../metrics';
import { ElasticsearchResponse } from '../../../../common/types/es';
import { LegacyRequest } from '../../../types';

export function handleResponse(shardStats: any, indexUuid: string) {
  return (response: ElasticsearchResponse) => {
    const indexStats =
      response.hits?.hits[0]?._source.index_stats ??
      response.hits?.hits[0]?._source.elasticsearch?.index;
    const primaries = indexStats?.primaries;
    const total = indexStats?.total;

    const stats = {
      documents: primaries?.docs?.count,
      dataSize: {
        primaries: primaries?.store?.size_in_bytes,
        total: total?.store?.size_in_bytes,
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
  req: LegacyRequest,
  esIndexPattern: string,
  shardStats: any,
  {
    clusterUuid,
    indexUuid,
    start,
    end,
  }: { clusterUuid: string; indexUuid: string; start: number; end: number }
) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getIndexSummary');

  const metric = ElasticsearchMetric.getMetricFields();
  const filters = [
    {
      bool: {
        should: [
          { term: { 'index_stats.index': indexUuid } },
          { term: { 'elasticsearch.index.name': indexUuid } },
        ],
      },
    },
  ];
  const params = {
    index: esIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        types: ['index', 'index_stats'],
        start,
        end,
        clusterUuid,
        metric,
        filters,
      }),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse(shardStats, indexUuid));
}
