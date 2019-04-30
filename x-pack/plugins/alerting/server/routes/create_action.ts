/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { ActionService } from '../action_service';
import { AlertService } from '../alert_service';
import { ConnectorService } from '../connector_service';
import { APP_ID } from '../../common/constants';

interface Server extends Hapi.Server {
  alerting: () => {
    actions: ActionService;
    alerts: AlertService;
    connectors: ConnectorService;
  };
}

interface CreateActionRequest extends Hapi.Request {
  server: Server;
  payload: {
    id: string;
    description: string;
    connectorId: string;
    connectorOptions: { [key: string]: any };
  };
}

export function createActionRoute(server: any) {
  server.route({
    method: 'POST',
    path: `/api/${APP_ID}/action`,
    options: {
      validate: {
        payload: Joi.object().keys({
          id: Joi.string().required(),
          description: Joi.string().required(),
          connectorId: Joi.string().required(),
          connectorOptions: Joi.object(),
        }),
      },
    },
    async handler(request: CreateActionRequest) {
      const savedObjectsClient = request.getSavedObjectsClient();
      return await request.server.alerting().actions.create(savedObjectsClient, request.payload);
    },
  });
}
