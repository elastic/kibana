/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { ActionsClient } from './actions_client';
import { ActionTypeService } from './action_type_service';
import { createFireFunction } from './create_fire_function';
import {
  createRoute,
  deleteRoute,
  findRoute,
  getRoute,
  updateRoute,
  listActionTypesRoute,
} from './routes';

export function init(server: Legacy.Server) {
  const actionsEnabled = server.config().get('xpack.actions.enabled');

  if (!actionsEnabled) {
    server.log(['info', 'actions'], 'Actions app disabled by configuration');
    return;
  }

  // Encrypted attributes
  server.plugins.encrypted_saved_objects!.registerType({
    type: 'action',
    attributesToEncrypt: new Set(['actionTypeConfigSecrets']),
  });

  const actionTypeService = new ActionTypeService();

  // Routes
  createRoute(server);
  deleteRoute(server);
  getRoute(server);
  findRoute(server);
  updateRoute(server);
  listActionTypesRoute(server);

  const fireFn = createFireFunction({
    actionTypeService,
    encryptedSavedObjectsPlugin: server.plugins.encrypted_saved_objects!,
  });

  // Expose service to server
  server.decorate('request', 'getActionsClient', function() {
    const request = this;
    const savedObjectsClient = request.getSavedObjectsClient();
    const actionsClient = new ActionsClient({
      savedObjectsClient,
      actionTypeService,
    });
    return actionsClient;
  });
  server.expose('fire', fireFn);
  server.expose('registerType', actionTypeService.register.bind(actionTypeService));
  server.expose('listTypes', actionTypeService.list.bind(actionTypeService));
}
