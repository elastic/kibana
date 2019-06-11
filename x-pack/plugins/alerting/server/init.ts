/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import {
  createAlertRoute,
  deleteAlertRoute,
  findRoute,
  getRoute,
  listAlertTypesRoute,
  updateAlertRoute,
} from './routes';
import { AlertingPlugin, Services } from './types';
import { AlertTypeRegistry } from './alert_type_registry';
import { AlertsClient } from './alerts_client';

export function init(server: Legacy.Server) {
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const savedObjectsClientWithInternalUser = server.savedObjects.getSavedObjectsRepository(
    callWithInternalUser
  );

  const services: Services = {
    log: server.log,
    callCluster: callWithInternalUser,
  };

  const { taskManager } = server;
  const alertTypeRegistry = new AlertTypeRegistry({
    services,
    taskManager: taskManager!,
    fireAction: server.plugins.actions!.fire,
    savedObjectsClient: savedObjectsClientWithInternalUser,
  });

  // Register routes
  createAlertRoute(server);
  deleteAlertRoute(server);
  findRoute(server);
  getRoute(server);
  listAlertTypesRoute(server);
  updateAlertRoute(server);

  // Expose functions
  server.decorate('request', 'getAlertsClient', function() {
    const request = this;
    const savedObjectsClient = request.getSavedObjectsClient();
    const alertsClient = new AlertsClient({
      services,
      savedObjectsClient,
      alertTypeRegistry,
      taskManager: taskManager!,
    });
    return alertsClient;
  });
  const exposedFunctions: AlertingPlugin = {
    registerType: alertTypeRegistry.register.bind(alertTypeRegistry),
    listTypes: alertTypeRegistry.list.bind(alertTypeRegistry),
  };
  server.expose(exposedFunctions);
}
