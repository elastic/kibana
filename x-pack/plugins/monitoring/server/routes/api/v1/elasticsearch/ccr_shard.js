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

      const minIntervalSeconds = config.get('xpack.monitoring.min_interval_seconds');
      const bucketSize = calculateTimeseriesInterval(min, max, minIntervalSeconds);

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

      try {
        const series = await getSeries(req, 'ccr', 'ccr_sync_lag_time', [], {
          min,
          max,
          bucketSize,
          metricOpts: {
            field: `indices.${index}.${shardId}.time_since_last_fetch_millis`
          }
        });

        const ccrResponse = await callWithRequest(req, 'search', {
          index: 'ccr',
          size: 1,
          filterPath: `hits.hits._source.indices.${index}.${shardId}`,
          body: {
            sort: [{ timestamp: { order: 'desc' } }],
            query: {
              bool: {
                must: [
                  {
                    exists: {
                      field: `indices.${index}.${shardId}`
                    }
                  }
                ]
              }
            }
          }
        });

        const shardData = get(ccrResponse, 'hits.hits[0]._source.indices');

        // const shardData = await
        // const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
        // const params = {
        //   index: 'ccr',
        //   filterPath: [
        //     `hits.hits._source.indices.${index}.${shardId}`,
        //     `aggregations.check.buckets`
        //   ],
        //   body: {
        //     sort: [{ timestamp: { order: 'desc' } }],
        //     size: 1,
        //     query: {
        //       bool: {
        //         must: [
        //           {
        //             exists: { field: `indices.${index}` }
        //           }
        //         ]
        //       }
        //     },
        //     aggs: {
        //       check: {
        //         date_histogram: {
        //           field: 'timestamp',
        //           interval: `${bucketSize}s`
        //         },
        //         aggs: {
        //           sync_lag_time: {
        //             max: {
        //               field: `indices.${index}.${shardId}.time_since_last_fetch_millis`
        //             }
        //           }
        //         }
        //       }
        //     }
        //   }
        // };
        // console.log(JSON.stringify(params));

        // const response = await callWithRequest(req, 'search', params);
        // const data = response;//get(response, 'hits.hits[0]._source');
        reply({
          series,
          shardData
        });
      } catch(err) {
        reply(handleError(err, req));
      }
    }
  });
}
