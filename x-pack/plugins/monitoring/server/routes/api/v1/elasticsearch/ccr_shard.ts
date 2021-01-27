/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { schema } from '@kbn/config-schema';
// @ts-ignore
import { handleError } from '../../../../lib/errors/handle_error';
// @ts-ignore
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
// @ts-ignore
import { getMetrics } from '../../../../lib/details/get_metrics';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../../common/constants';
import { ElasticsearchResponse } from '../../../../../common/types/es';
import { LegacyRequest } from '../../../../types';

function getFormattedLeaderIndex(leaderIndex: string) {
  let leader = leaderIndex;
  if (leader.includes(':')) {
    const leaderSplit = leader.split(':');
    leader = `${leaderSplit[1]} on ${leaderSplit[0]}`;
  }
  return leader;
}

async function getCcrStat(req: LegacyRequest, esIndexPattern: string, filters: unknown[]) {
  const min = moment.utc(req.payload.timeRange.min).valueOf();
  const max = moment.utc(req.payload.timeRange.max).valueOf();

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  const params = {
    index: esIndexPattern,
    size: 1,
    filterPath: [
      'hits.hits._source.ccr_stats',
      'hits.hits._source.timestamp',
      'hits.hits.inner_hits.oldest.hits.hits._source.ccr_stats.operations_written',
      'hits.hits.inner_hits.oldest.hits.hits._source.ccr_stats.failed_read_requests',
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

export function ccrShardRoute(server: { route: (p: any) => void; config: () => {} }) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/ccr/{index}/shard/{shardId}',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          index: schema.string(),
          shardId: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req: LegacyRequest) {
      const config = server.config();
      const index = req.params.index;
      const shardId = req.params.shardId;
      const ccs = req.payload.ccs;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);

      const filters = [
        {
          term: {
            type: {
              value: 'ccr_stats',
            },
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
            esIndexPattern,
            [
              { keys: ['ccr_sync_lag_time'], name: 'ccr_sync_lag_time' },
              { keys: ['ccr_sync_lag_ops'], name: 'ccr_sync_lag_ops' },
            ],
            filters
          ),
          getCcrStat(req, esIndexPattern, filters),
        ]);

        const stat = ccrResponse.hits?.hits[0]?._source.ccr_stats ?? {};
        const oldestStat =
          ccrResponse.hits?.hits[0].inner_hits?.oldest.hits?.hits[0]?._source.ccr_stats ?? {};

        return {
          metrics,
          stat,
          formattedLeader: getFormattedLeaderIndex(stat.leader_index ?? ''),
          timestamp: ccrResponse.hits?.hits[0]?._source.timestamp,
          oldestStat,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
