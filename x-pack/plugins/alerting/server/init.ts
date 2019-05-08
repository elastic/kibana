/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { ActionService } from './action_service';
import { ActionTypeService } from './action_type_service';
import {
  createActionRoute,
  deleteActionRoute,
  findActionRoute,
  getActionRoute,
  updateActionRoute,
  listActionTypesRoute,
} from './routes';

export function init(server: Hapi.Server) {
  const alertingEnabled = server.config().get('xpack.alerting.enabled');

  if (!alertingEnabled) {
    server.log(['info', 'alerting'], 'Alerting app disabled by configuration');
    return;
  }

  // Encrypted attributes
  server.plugins.encrypted_saved_objects!.registerType({
    type: 'action',
    attributesToEncrypt: new Set(['actionTypeConfigSecrets']),
  });

  const actionTypeService = new ActionTypeService();
  const actionService = new ActionService(
    actionTypeService,
    server.plugins.encrypted_saved_objects
  );

  // Routes
  createActionRoute(server);
  deleteActionRoute(server);
  getActionRoute(server);
  findActionRoute(server);
  updateActionRoute(server);
  listActionTypesRoute(server);

  // Register service to server
  server.decorate('server', 'alerting', () => ({
    actions: actionService,
    actionTypes: actionTypeService,
  }));
}
