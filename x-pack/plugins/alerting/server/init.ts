/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { AlertService } from './alert_service';
import { createScheduleRoute } from './routes';

export function init(server: Legacy.Server) {
  const alertingEnabled = server.config().get('xpack.alerting.enabled');

  if (!alertingEnabled) {
    server.log(['info', 'alerting'], 'Alerting app disabled by configuration');
    return;
  }

  const { taskManager } = server;
  const alertService = new AlertService({
    taskManager: taskManager!,
    fireAction: server.plugins.actions!.fire,
  });

  // Register routes
  createScheduleRoute(server);

  // Expose functions
  server.expose('register', alertService.register.bind(alertService));
  server.expose('schedule', alertService.schedule.bind(alertService));
}
