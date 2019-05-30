/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { createFireFunction } from './create_fire_function';
import { ActionsPlugin } from './types';
import {
  createRoute,
  deleteRoute,
  findRoute,
  getRoute,
  updateRoute,
  listActionTypesRoute,
} from './routes';

import { registerBuiltInActionTypes } from './builtin_action_types';

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

  const actionTypeRegistry = new ActionTypeRegistry({
    services: {
      log: server.log,
    },
  });

  registerBuiltInActionTypes(actionTypeRegistry);

  // Routes
  createRoute(server);
  deleteRoute(server);
  getRoute(server);
  findRoute(server);
  updateRoute(server);
  listActionTypesRoute(server);

  const fireFn = createFireFunction({
    actionTypeRegistry,
    encryptedSavedObjectsPlugin: server.plugins.encrypted_saved_objects!,
  });

  // Expose functions to server
  server.decorate('request', 'getActionsClient', function() {
    const request = this;
    const savedObjectsClient = request.getSavedObjectsClient();
    const actionsClient = new ActionsClient({
      savedObjectsClient,
      actionTypeRegistry,
    });
    return actionsClient;
  });
  const exposedFunctions: ActionsPlugin = {
    fire: fireFn,
    registerType: actionTypeRegistry.register.bind(actionTypeRegistry),
    listTypes: actionTypeRegistry.list.bind(actionTypeRegistry),
  };
  server.expose(exposedFunctions);
}
