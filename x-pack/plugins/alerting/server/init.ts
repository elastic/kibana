/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { createAlertRoute } from './routes';
import { AlertingPlugin } from './types';
import { AlertTypeRegistry } from './alert_type_registry';
import { AlertsClient } from './alerts_client';

export function init(server: Legacy.Server) {
  const alertingEnabled = server.config().get('xpack.alerting.enabled');

  if (!alertingEnabled) {
    server.log(['info', 'alerting'], 'Alerting app disabled by configuration');
    return;
  }

  const { taskManager } = server;
  const alertTypeRegistry = new AlertTypeRegistry({
    taskManager: taskManager!,
    fireAction: server.plugins.actions!.fire,
  });

  // Register routes
  createAlertRoute(server);

  // Expose functions
  server.decorate('request', 'getAlertsClient', function() {
    const alertsClient = new AlertsClient({
      taskManager: taskManager!,
    });
    return alertsClient;
  });
  const exposedFunctions: AlertingPlugin = {
    register: alertTypeRegistry.register.bind(alertTypeRegistry),
  };
  server.expose(exposedFunctions);
}
