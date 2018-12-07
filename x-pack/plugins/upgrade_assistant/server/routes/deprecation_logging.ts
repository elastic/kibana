/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { Server } from 'src/server/kbn_server';

import {
  getDeprecationLoggingStatus,
  setDeprecationLogging,
} from '../lib/es_deprecation_logging_apis';

export function registerDeprecationLoggingRoutes(server: Server) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  server.route({
    path: '/api/upgrade_assistant/deprecation_logging',
    method: 'GET',
    async handler(request) {
      try {
        return await getDeprecationLoggingStatus(callWithRequest, request);
      } catch (e) {
        return Boom.boomify(e, { statusCode: 500 });
      }
    },
  });

  server.route({
    path: '/api/upgrade_assistant/deprecation_logging',
    method: 'PUT',
    options: {
      validate: {
        payload: Joi.object({
          isEnabled: Joi.boolean(),
        }),
      },
    },
    async handler(request) {
      try {
        const { isEnabled } = request.payload as { isEnabled: boolean };
        return await setDeprecationLogging(callWithRequest, request, isEnabled);
      } catch (e) {
        return Boom.boomify(e, { statusCode: 500 });
      }
    },
  });
}
