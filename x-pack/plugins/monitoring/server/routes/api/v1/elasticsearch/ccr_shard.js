/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import Joi from 'joi';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getMetrics } from '../../../../lib/details/get_metrics';

async function getCcrStat(req, esIndexPattern, filters) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  return await callWithRequest(req, 'search', {
    index: esIndexPattern,
    size: 1,
    filterPath: `hits.hits._source.ccr_stats`,
    body: {
      sort: [{ timestamp: { order: 'desc' } }],
      query: {
        bool: {
          must: filters,
        }
      }
    }
  });
}

export function ccrShardRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/ccr/{index}/shard/{shardId}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          index: Joi.string().required(),
          shardId: Joi.string().required()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required(),
        })
      }
    },
    async handler(req, reply) {
      const config = server.config();
      const index = req.params.index;
      const shardId = req.params.shardId;
      const ccs = req.payload.ccs;
      const esIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.elasticsearch.index_pattern', ccs);

      const filters = [
        {
          term: {
            type: {
              value: 'ccr_stats'
            }
          }
        },
        {
          term: {
            'ccr_stats.follower_index': {
              value: index,
            }
          }
        },
        {
          term: {
            'ccr_stats.shard_id': {
              value: shardId,
            }
          }
        }
      ];

      try {

        const [
          metrics,
          ccrResponse
        ] = await Promise.all([
          getMetrics(req, esIndexPattern, [
            { keys: ['ccr_sync_lag_time'], name: 'ccr_sync_lag_time' },
            { keys: ['ccr_sync_lag_ops'], name: 'ccr_sync_lag_ops' },
          ], filters),
          getCcrStat(req, esIndexPattern, filters)
        ]);

        const stat = get(ccrResponse, 'hits.hits[0]._source.ccr_stats');
        reply({
          metrics,
          stat
        });
      } catch(err) {
        reply(handleError(err, req));
      }
    }
  });
}
