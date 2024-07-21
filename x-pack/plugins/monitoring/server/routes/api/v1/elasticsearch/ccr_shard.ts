/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postElasticsearchCcrShardRequestParamsRT,
  postElasticsearchCcrShardRequestPayloadRT,
  postElasticsearchCcrShardResponsePayloadRT,
} from '../../../../../common/http_api/elasticsearch';
import { TimeRange } from '../../../../../common/http_api/shared';
import { ElasticsearchResponse } from '../../../../../common/types/es';
import {
  getIndexPatterns,
  getElasticsearchDataset,
} from '../../../../lib/cluster/get_index_patterns';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors/handle_error';
import { Globals } from '../../../../static_globals';
import { LegacyRequest, MonitoringCore } from '../../../../types';

function getFormattedLeaderIndex(leaderIndex: string) {
  let leader = leaderIndex;
  if (leader.includes(':')) {
    const leaderSplit = leader.split(':');
    leader = `${leaderSplit[1]} on ${leaderSplit[0]}`;
  }
  return leader;
}

async function getCcrStat(
  req: LegacyRequest<unknown, unknown, { timeRange: TimeRange }>,
  esIndexPattern: string,
  filters: unknown[]
) {
  const { min, max } = req.payload.timeRange;
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  const params = {
    index: esIndexPattern,
    size: 1,
    filter_path: [
      'hits.hits._source.ccr_stats',
      'hits.hits._source.elasticsearch.ccr',
      'hits.hits._source.timestamp',
      'hits.hits._source.@timestamp',
      'hits.hits.inner_hits.oldest.hits.hits._source.ccr_stats.operations_written',
      'hits.hits.inner_hits.oldest.hits.hits._source.elasticsearch.ccr.follower.operations_written',
      'hits.hits.inner_hits.oldest.hits.hits._source.ccr_stats.failed_read_requests',
      'hits.hits.inner_hits.oldest.hits.hits._source.elasticsearch.ccr.requests.failed.read.count',
    ],
    body: {
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
      query: {
        bool: {
          must: [
            ...filters,
            {
              range: {
                timestamp: {
                  format: 'epoch_millis',
                  gte: min,
                  lte: max,
                },
              },
            },
          ],
        },
      },
      collapse: {
        field: 'ccr_stats.follower_index',
        inner_hits: {
          name: 'oldest',
          size: 1,
          sort: [{ timestamp: { order: 'asc', unmapped_type: 'long' } }],
        },
      },
    },
  };

  return await callWithRequest(req, 'search', params);
}

export function ccrShardRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postElasticsearchCcrShardRequestParamsRT);
  const validateBody = createValidationFunction(postElasticsearchCcrShardRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/ccr/{index}/shard/{shardId}',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    async handler(req) {
      const index = req.params.index;
      const shardId = req.params.shardId;
      const moduleType = 'elasticsearch';
      const dataset = 'ccr';
      const esIndexPattern = getIndexPatterns({
        config: Globals.app.config,
        ccs: req.payload.ccs,
        moduleType,
        dataset,
      });

      const filters = [
        {
          bool: {
            should: [
              { term: { 'data_stream.dataset': { value: getElasticsearchDataset(dataset) } } },
              {
                term: {
                  'metricset.name': {
                    value: dataset,
                  },
                },
              },
              {
                term: {
                  type: {
                    value: 'ccr_stats',
                  },
                },
              },
            ],
          },
        },
        {
          term: {
            'ccr_stats.follower_index': {
              value: index,
            },
          },
        },
        {
          term: {
            'ccr_stats.shard_id': {
              value: shardId,
            },
          },
        },
      ];

      try {
        const [metrics, ccrResponse]: [unknown, ElasticsearchResponse] = await Promise.all([
          getMetrics(
            req,
            'elasticsearch',
            [
              { keys: ['ccr_sync_lag_time'], name: 'ccr_sync_lag_time' },
              { keys: ['ccr_sync_lag_ops'], name: 'ccr_sync_lag_ops' },
            ],
            filters
          ),
          getCcrStat(req, esIndexPattern, filters),
        ]);

        const legacyStat = ccrResponse.hits?.hits[0]?._source.ccr_stats;
        const mbStat = ccrResponse.hits?.hits[0]?._source.elasticsearch?.ccr;
        const oldestLegacyStat =
          ccrResponse.hits?.hits[0].inner_hits?.oldest.hits?.hits[0]?._source.ccr_stats;
        const oldestMBStat =
          ccrResponse.hits?.hits[0].inner_hits?.oldest.hits?.hits[0]?._source.elasticsearch?.ccr;

        const leaderIndex = mbStat ? mbStat?.leader?.index : legacyStat?.leader_index;

        return postElasticsearchCcrShardResponsePayloadRT.encode({
          metrics,
          stat: mbStat ?? legacyStat,
          formattedLeader: getFormattedLeaderIndex(leaderIndex ?? ''),
          timestamp:
            ccrResponse.hits?.hits[0]?._source['@timestamp'] ??
            ccrResponse.hits?.hits[0]?._source.timestamp,
          oldestStat: oldestMBStat ?? oldestLegacyStat,
        });
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
