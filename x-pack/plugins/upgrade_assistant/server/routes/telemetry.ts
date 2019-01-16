/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { UpgradeAssistantTelemetryServer } from '../../common/types';

import { upsertUIOpenOption } from '../lib/telemetry/es_ui_open_apis';

export function registerTelemetryRoutes(server: UpgradeAssistantTelemetryServer) {
  server.route({
    path: '/api/upgrade_assistant/telemetry/ui_open',
    method: 'PUT',
    options: {
      validate: {
        payload: Joi.object({
          overview: Joi.boolean().default(false),
          cluster: Joi.boolean().default(false),
          indices: Joi.boolean().default(false),
        }),
      },
    },
    async handler(request) {
      try {
        return await upsertUIOpenOption(server, request);
      } catch (e) {
        return Boom.boomify(e, { statusCode: 500 });
      }
    },
  });
}
