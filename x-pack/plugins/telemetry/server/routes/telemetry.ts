/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { boomify } from 'boom';

import { getStats } from './get_stats';

import {
  HttpServiceSetup,
} from '../../../../../src/core/server';


export function registerRoutes(http: HttpServiceSetup) {
  /**
   * Change Telemetry Opt-In preference.
   */
  server.route({
    method: 'POST',
    path: '/api/telemetry/v1/optIn',
    config: {
      validate: {
        payload: Joi.object({
          enabled: Joi.bool().required()
        })
      }
    },
    handler: async (req, h) => {
      const savedObjectsClient = req.getSavedObjectsClient();
      try {
        await savedObjectsClient.create('telemetry', {
          enabled: req.payload.enabled
        }, {
          id: 'telemetry',
          overwrite: true,
        });
      } catch (err) {
        return boomify(err);
      }
      return h.response({}).code(200);
    }
  });


  /**
   * Telemetry Data
   *
   * This provides a mechanism for fetching minor details about all clusters, including details related to the rest of the
   * stack (e.g., Kibana).
   */
  server.route({
    method: 'POST',
    path: '/api/telemetry/v1/clusters/_stats',
    config: {
      validate: {
        payload: Joi.object({
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required()
        })
      }
    },
    handler: async (req, h) => {
      const config = req.server.config();
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;

      try {
        return await getStats(req, config, start, end);
      } catch (err) {
        if (config.get('env.dev')) {
        // don't ignore errors when running in dev mode
          return boomify(err, { statusCode: err.status });
        } else {
        // ignore errors, return empty set and a 200
          return h.response([]).code(200);
        }
      }
    }
  });
}
