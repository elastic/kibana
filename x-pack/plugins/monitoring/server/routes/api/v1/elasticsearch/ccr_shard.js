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

async function getSyncLagTimeSeries(req, esIndexPattern, filters, min, max, bucketSize) {
  return await getSeries(
    req,
    esIndexPattern,
    'ccr_sync_lag_time',
    filters,
    { min, max, bucketSize }
  );
}

async function getSyncLagOpsSeries(req, esIndexPattern, filters, min, max, bucketSize) {
  return await getSeries(
    req,
    esIndexPattern,
    'ccr_sync_lag_ops',
    filters,
    { min, max, bucketSize }
  );
}

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
      const min = req.payload.timeRange.min;
      const max = req.payload.timeRange.max;
      const ccs = req.payload.ccs;
      const esIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.elasticsearch.index_pattern', ccs);

      const minIntervalSeconds = config.get('xpack.monitoring.min_interval_seconds');
      const bucketSize = calculateTimeseriesInterval(min, max, minIntervalSeconds);

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
          syncLagTime,
          syncLagOps,
          ccrResponse
        ] = await Promise.all([
          getSyncLagTimeSeries(req, esIndexPattern, filters, min, max, bucketSize),
          getSyncLagOpsSeries(req, esIndexPattern, filters, min, max, bucketSize),
          getCcrStat(req, esIndexPattern, filters)
        ]);

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
