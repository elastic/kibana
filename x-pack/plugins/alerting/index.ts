/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import mappings from './mappings.json';
import { logConnector, messageSlackConnector, emailConnector } from './server/default_connectors';
import {
  createActionRoute,
  deleteActionRoute,
  findActionRoute,
  getActionRoute,
  updateActionRoute,
  AlertService,
  ActionService,
  ConnectorService,
} from './server';

import { APP_ID } from './common/constants';

export function alerting(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.alerting',
    require: ['kibana', 'elasticsearch'],
    config(Joi: any) {
      return Joi.object()
        .keys({
          enabled: Joi.boolean().default(true),
        })
        .default();
    },
    init(server: Hapi.Server) {
      const alertingEnabled = server.config().get('xpack.alerting.enabled');

      if (!alertingEnabled) {
        server.log(['info', 'alerting'], 'Alerting app disabled by configuration');
        return;
      }

      const connectorService = new ConnectorService();
      const actionService = new ActionService(connectorService);
      const alertService = new AlertService();

      // Register default connectors
      connectorService.register(logConnector);
      connectorService.register(messageSlackConnector);
      connectorService.register(emailConnector);

      // Routes
      createActionRoute(server);
      deleteActionRoute(server);
      getActionRoute(server);
      findActionRoute(server);
      updateActionRoute(server);

      // Register service to server
      server.decorate('server', 'alerting', () => ({
        alerts: alertService,
        actions: actionService,
        connectors: connectorService,
      }));
    },
    uiExports: {
      mappings,
    },
  });
}
