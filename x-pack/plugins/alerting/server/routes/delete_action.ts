/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

interface DeleteActionRequest extends Hapi.Request {
  server: Server;
  params: {
    id: string;
  };
}

export function deleteActionRoute(server: Hapi.Server) {
  server.route({
    method: 'DELETE',
    path: `/api/${APP_ID}/action/{id}`,
    async handler(request: DeleteActionRequest) {
      const savedObjectsClient = request.getSavedObjectsClient();
      return await request.server.alerting().actions.delete(savedObjectsClient, request.params.id);
    },
  });
}
