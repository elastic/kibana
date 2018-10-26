/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { resolve } from 'path';
import { PLUGIN } from './common/constants';

export const heartbeat = (kibana: any) =>
  new kibana.Plugin({
    configPrefix: 'xpack.heartbeat',
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        description: 'Monitor your endpoints',
        icon: 'plugins/heartbeat/icons/heartbeat_white.svg',
        title: 'Heartbeat',
        listed: false,
        main: 'plugins/heartbeat/app',
        url: 'heartbeat',
      },
      home: ['plugins/heartbeat/register_feature'],
    },
    init(server: any) {
      server.route({
        path: '/api/heartbeat/test',
        method: 'GET',
        handler: async (req: any, rep: any) => {
          return rep({
            hello: 'world',
          });
        },
      });

      // server.route({
      //   path: 'api/heartbeat/all',
      //   method: 'GET',
      //   handler: async (req: any, rep: any) => {
      //     return rep({ works: 'well' });
      //   },
      // });

      server.route({
        config: {
          validate: {
            payload: Joi.object({
              timeseries: Joi.object({
                min: Joi.date().required(),
                max: Joi.date().required(),
              }).required(),
            }).required(),
          },
        },
        path: '/api/heartbeat/any',
        method: 'POST',
        handler: async (req: any, rep: any) => {
          const {
            payload: {
              timeseries: { min, max },
            },
          } = req;
          const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
          try {
            const result = await callWithRequest(req, 'search', {
              index: 'heartbeat*',
              body: {
                query: {
                  range: {
                    '@timestamp': { gte: min, lte: max },
                  },
                },
                aggs: {
                  monitors_over_time: {
                    date_histogram: {
                      field: '@timestamp',
                      interval: 'hour',
                    },
                    aggs: {
                      status_up: {
                        terms: {
                          field: 'monitor.status',
                          size: 10,
                        },
                      },
                    },
                  },
                  monitors: {
                    terms: {
                      field: 'monitor.id',
                      size: 10,
                    },
                    aggs: {
                      most_recent_ping: {
                        top_hits: {
                          sort: [
                            {
                              '@timestamp': { order: 'desc' },
                            },
                          ],
                          _source: {
                            includes: ['@timestamp', 'monitor.status'],
                          },
                          size: 1,
                        },
                      },
                    },
                  },
                },
              },
            });
            return rep(result);
          } catch (err) {
            return rep(err);
          }
        },
      });
    },
  });
