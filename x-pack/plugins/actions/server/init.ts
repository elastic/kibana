/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { ActionService } from './action_service';
import { ActionTypeService } from './action_type_service';
import {
  createRoute,
  deleteRoute,
  findRoute,
  getRoute,
  updateRoute,
  listActionTypesRoute,
} from './routes';

export function init(server: Hapi.Server) {
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
  const actionService = new ActionService(
    actionTypeService,
    server.plugins.encrypted_saved_objects
  );

  // Routes
  createRoute(server);
  deleteRoute(server);
  getRoute(server);
  findRoute(server);
  updateRoute(server);
  listActionTypesRoute(server);

  // Expose service to server
  server.expose('create', actionService.create.bind(actionService));
  server.expose('get', actionService.get.bind(actionService));
  server.expose('find', actionService.find.bind(actionService));
  server.expose('delete', actionService.delete.bind(actionService));
  server.expose('update', actionService.update.bind(actionService));
  server.expose('fire', actionService.fire.bind(actionService));
  server.expose('registerType', actionTypeService.register.bind(actionTypeService));
  server.expose('listTypes', actionTypeService.list.bind(actionTypeService));
}
