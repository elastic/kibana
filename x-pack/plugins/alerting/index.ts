/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import mappings from './mappings.json';
import {
  createActionRoute,
  deleteActionRoute,
  findActionRoute,
  getActionRoute,
  updateActionRoute,
  listconnectorsRoute,
  AlertService,
  ActionService,
  ConnectorService,
} from './server';

import { APP_ID } from './common/constants';

export function alerting(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.alerting',
    require: ['kibana', 'elasticsearch', 'encrypted_saved_objects'],
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

      // Encrypted attributes
      server.plugins.encrypted_saved_objects!.registerType({
        type: 'action',
        attributesToEncrypt: new Set(['connectorOptionsSecrets']),
      });

      const connectorService = new ConnectorService();
      const actionService = new ActionService(
        connectorService,
        server.plugins.encrypted_saved_objects
      );
      const alertService = new AlertService();

      // Routes
      createActionRoute(server);
      deleteActionRoute(server);
      getActionRoute(server);
      findActionRoute(server);
      updateActionRoute(server);
      listconnectorsRoute(server);

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
