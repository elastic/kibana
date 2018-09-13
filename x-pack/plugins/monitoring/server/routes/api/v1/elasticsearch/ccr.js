/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { get } from 'lodash';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';

export function ccrRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/ccr',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).optional()
        })
      }
    },
    async handler(req, reply) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const esIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.elasticsearch.index_pattern', ccs);

      try {
        const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
        const response = await callWithRequest(req, 'search', {
          index: esIndexPattern,
          size: config.get('xpack.monitoring.max_bucket_size'),
          filterPath: 'hits.hits._source.ccr_stats',
          body: {
            sort: [{ timestamp: { order: 'desc' } }],
            query: {
              bool: {
                must: [
                  {
                    term: {
                      type: {
                        value: 'ccr_stats'
                      }
                    }
                  }
                ]
              }
            },
            collapse: {
              field: 'ccr_stats.follower_index'
            },
          }
        });

        const stats = get(response, 'hits.hits').map(hit => hit._source.ccr_stats);
        const data = stats.reduce((accum, _stat) => {
          const { allByFollowerIndex, shardStatsByFollowerIndex } = accum;

          let follows = _stat.leader_index;
          if (_stat.leader_index.includes(':')) {
            const followsSplit = follows.split(':');
            follows = `${followsSplit[1]} on ${followsSplit[0]}`;
          }

          const stat = {
            id: _stat.follower_index,
            index: _stat.follower_index,
            follows,
            shardId: _stat.shard_id,
            opsSynced: _stat.number_of_operations_indexed,
            syncLagTime: _stat.time_since_last_fetch_millis,
            syncLagOps: _stat.leader_max_seq_no - _stat.follower_global_checkpoint,
            error: _stat.fetch_exceptions[0]
          };

          const statByShardId = allByFollowerIndex[stat.id];
          if (statByShardId) {
            statByShardId.opsSynced += stat.opsSynced;
            statByShardId.syncLagTime = Math.max(statByShardId.syncLagTime, stat.syncLagTime);
            statByShardId.syncLagOps = Math.max(statByShardId.syncLagOps, stat.syncLagOps);
            statByShardId.error = statByShardId.error || stat.error;
          } else {
            allByFollowerIndex[stat.id] = stat;
          }

          const shardStats = shardStatsByFollowerIndex[_stat.follower_index];
          if (shardStats) {
            if (!shardStats[_stat.shard_id]) {
              shardStats[_stat.shard_id] = stat;
            }
          } else {
            shardStatsByFollowerIndex[_stat.follower_index] = { [_stat.shard_id]: stat };
          }

          return accum;
        }, { allByFollowerIndex: {}, shardStatsByFollowerIndex: {} });

        data.all = Object.values(data.allByFollowerIndex);
        data.all.sort((a, b) => a.index > b.index);
        delete data.allByFollowerIndex;

        reply({ data });
      } catch(err) {
        reply(handleError(err, req));
      }
    }
  });
}
