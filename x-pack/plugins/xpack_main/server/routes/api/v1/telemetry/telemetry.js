/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { boomify } from 'boom';
import { getAllStats, getLocalStats, encryptTelemetry } from '../../../../lib/telemetry';

export function isAllowedToViewTelemetryData(req) {
  const { roles } = req.auth.credential;
  return roles.some(role => /superuser|remote_monitoring_collector|remote_monitoring_agent/.test(role));
}

/**
 * Get the telemetry data.
 *
 * @param {Object} req The incoming request.
 * @param {Object} config Kibana config.
 * @param {String} start The start time of the request (likely 20m ago).
 * @param {String} end The end time of the request.
 * @return {Promise} An array of telemetry objects.
 */
export async function getTelemetry(req, config, start, end, { _getAllStats = getAllStats, _getLocalStats = getLocalStats } = {}) {
  let response = [];

  if (config.get('xpack.monitoring.enabled')) {
    try {
      // attempt to collect stats from multiple clusters in monitoring data
      response = await _getAllStats(req, start, end);
    } catch (err) {
      // no-op
    }
  }

  if (!Array.isArray(response) || response.length === 0) {
    // return it as an array for a consistent API response
    response = [await _getLocalStats(req)];
  }

  return response;
}

export function telemetryRoute(server) {
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
        viewUnencrypted: Joi.bool(),
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
      const viewUnencrypted = req.viewUnencrypted;
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;

      if(viewUnencrypted) {
        const isAllowed = viewUnencrypted && isAllowedToViewTelemetryData(req);
        if(!isAllowed) {
          const notAllowedErr = Error('Not allowed.');
          notAllowedErr.status = 401;
          throw notAllowedErr;
        }
      }

      try {
        const usageData = await getTelemetry(req, config, start, end);
        if(viewUnencrypted) {
          return usageData;
        }

        return encryptTelemetry(req, usageData);
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
