/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

import { APP_ID } from '../../common/constants';
import { ActionService } from '../action_service';
import { AlertService } from '../alert_service';
import { ConnectorService } from '../connector_service';

interface Server extends Hapi.Server {
  alerting: () => {
    actions: ActionService;
    alerts: AlertService;
    connectors: ConnectorService;
  };
}

interface UpdateActionRequest extends Hapi.Request {
  server: Server;
  payload: {
    description: string;
    connectorId: string;
    connectorOptions: { [key: string]: any };
  };
}

export function updateActionRoute(server: Hapi.Server) {
  server.route({
    method: 'PUT',
    path: `/api/${APP_ID}/action/{id}`,
    options: {
      validate: {
        payload: Joi.object()
          .keys({
            description: Joi.string().required(),
            connectorId: Joi.string().required(),
            connectorOptions: Joi.object(),
          })
          .required(),
      },
    },
    async handler(request: UpdateActionRequest) {
      const savedObjectsClient = request.getSavedObjectsClient();
      return await request.server
        .alerting()
        .actions.update(savedObjectsClient, request.params.id, request.payload);
    },
  });
}
