/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import Joi from 'joi';
import { handleError } from '../../../../lib/errors/handle_error';
import { calculateTimeseriesInterval } from '../../../../lib/calculate_timeseries_interval';
import { getSeries } from '../../../../lib/details/get_series';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';

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
      const min = req.payload.timeRange.min;
      const max = req.payload.timeRange.max;
      const ccs = req.payload.ccs;
      const esIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.elasticsearch.index_pattern', ccs);

      const minIntervalSeconds = config.get('xpack.monitoring.min_interval_seconds');
      const bucketSize = calculateTimeseriesInterval(min, max, minIntervalSeconds);

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

      try {
        const syncLagTime = await getSeries(
          req,
          esIndexPattern,
          'ccr_sync_lag_time',
          [
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
          ],
          { min, max, bucketSize }
        );

        const syncLagOps = await getSeries(
          req,
          esIndexPattern,
          'ccr_sync_lag_ops',
          [
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
          ],
          { min, max, bucketSize }
        );

        const ccrResponse = await callWithRequest(req, 'search', {
          index: esIndexPattern,
          size: 1,
          filterPath: `hits.hits._source.ccr_stats`,
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
                ]
              }
            }
          }
        });

        const stat = get(ccrResponse, 'hits.hits[0]._source.ccr_stats');

        reply({
          metrics: {
            sync_lag_time: syncLagTime,
            sync_lag_ops: syncLagOps,
          },
          stat
        });
      } catch(err) {
        reply(handleError(err, req));
      }
    }
  });
}
