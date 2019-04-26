/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { AlertingService } from '../alerting_service';

interface Server extends Hapi.Server {
  alerting: AlertingService;
}

interface CreateActionRequest extends Hapi.Request {
  payload: {
    id: string;
    description: string;
    connectorId: string;
    connectorOptions: { [key: string]: any };
    connectorOptionsSecrets: { [key: string]: any };
  };
  server: Server;
}

export function createActionRoute(server: any) {
  server.route({
    method: 'POST',
    path: '/api/alerting/action',
    options: {
      validate: {
        payload: Joi.object().keys({
          id: Joi.string().required(),
          description: Joi.string().required(),
          connectorId: Joi.string().required(),
          connectorOptions: Joi.object(),
          connectorOptionsSecrets: Joi.object(),
        }),
      },
    },
    async handler(request: CreateActionRequest) {
      const savedObjectsClient = request.getSavedObjectsClient();
      return await request.server.alerting.createAction(savedObjectsClient, request.payload);
    },
  });
}
