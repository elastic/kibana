/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerRoute } from 'hapi';
import { Legacy } from 'kibana';
import {
  createEmailAction,
  createSlackAction,
  LoggerAction,
  notificationService,
  ServerFacade,
} from './server';
import { notificationServiceSendRoute } from './server/routes/api/v1/notifications';

/**
 * Initialize the Action Service with various actions provided by X-Pack, when configured.
 *
 * @param server {Object} HapiJS server instance
 */
export function init(legacyServer: Legacy.Server): void {
  const server: ServerFacade = {
    log: legacyServer.log,
    config: legacyServer.config,
    plugins: legacyServer.plugins,
  };

  // the logger
  notificationService.setAction(new LoggerAction({ server }));

  if (server.config().get('xpack.notifications.email.enabled')) {
    notificationService.setAction(createEmailAction(server));
  }

  if (server.config().get('xpack.notifications.slack.enabled')) {
    notificationService.setAction(createSlackAction(server));
  }

  const route: ServerRoute = notificationServiceSendRoute(server, notificationService);
  legacyServer.route(route);

  // expose the notification service for other plugins
  legacyServer.expose('notificationService', notificationService);
}
