/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { boomify } from 'boom';
import { getStats } from '../collectors'
import { CoreSetup } from 'src/core/server';

export function registerTelemetryDataRoutes(core: CoreSetup) {
  const { server } = core.http;
  server.route({
    method: 'POST',
    path: '/api/telemetry/v1/clusters/_stats',
    options: {
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
