/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ActionsClient } from './actions_client';
import { ActionTypeService } from './action_type_service';
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

  function createActionsClient(savedObjectsClient: SavedObjectsClient) {
    const actionsClient = new ActionsClient({
      savedObjectsClient,
      actionTypeService,
      encryptedSavedObjectsPlugin: server.plugins.encrypted_saved_objects!,
    });
    return actionsClient;
  }

  // Expose service to server
  server.decorate('request', 'getActionsClient', function() {
    const request = this;
    return createActionsClient(request.getSavedObjectsClient());
  });
  server.expose('createActionsClient', createActionsClient);
  server.expose('registerType', actionTypeService.register.bind(actionTypeService));
  server.expose('listTypes', actionTypeService.list.bind(actionTypeService));
}
