/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  notificationService,
  createEmailAction,
  createSlackAction,
  LoggerAction,
} from './server';
import { notificationServiceSendRoute } from './server/routes/api/v1/notifications';

/**
 * Initialize the Action Service with various actions provided by X-Pack, when configured.
 *
 * @param server {Object} HapiJS server instance
 */
export function init(server) {
  const config = server.config();

  // the logger
  notificationService.setAction(new LoggerAction({ server }));

  if (config.get('xpack.notifications.email.enabled')) {
    notificationService.setAction(createEmailAction(server));
  }

  if (config.get('xpack.notifications.slack.enabled')) {
    notificationService.setAction(createSlackAction(server));
  }

  notificationServiceSendRoute(server, notificationService);

  // expose the notification service for other plugins
  server.expose('notificationService', notificationService);
}
