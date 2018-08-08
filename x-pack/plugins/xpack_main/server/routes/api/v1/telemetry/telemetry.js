/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { wrap } from 'boom';
import { getAllStats, getLocalStats } from '../../../../lib/telemetry';

/**
 * Get the telemetry data.
 *
 * @param {Object} req The incoming request.
 * @param {Object} config Kibana config.
 * @param {String} start The start time of the request (likely 20m ago).
 * @param {String} end The end time of the request.
 * @return {Promise} An array of telemetry objects.
 */
export async function getTelemetry(req, config, start, end, { _getAllStats = getAllStats, _getLocalStats = getLocalStats } = { }) {
  let response = [];

  if (config.get('xpack.monitoring.enabled')) {
    response = await _getAllStats(req, start, end);
  }

  if (!Array.isArray(response) || response.length === 0) {
    // return it as an array for a consistent API response
    response = [ await _getLocalStats(req) ];
  }

  return response;
}

export function telemetryRoute(server) {
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
    handler: async (req, reply) => {
      const config = req.server.config();
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;

      try {
        reply(await getTelemetry(req, config, start, end));
      } catch (err) {
        if (config.get('env.dev')) {
        // don't ignore errors when running in dev mode
          reply(wrap(err));
        } else {
        // ignore errors, return empty set and a 200
          reply([]).code(200);
        }
      }
    }
  });
}
