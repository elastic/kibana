/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin } from './server/plugin';
/**
 * Initialize the Action Service with various actions provided by X-Pack, when configured.
 *
 * @param server {Object} HapiJS server instance
 */
export function init(server: any): void {
  const coreSetup = {
    ...server.newPlatform.setup.core,
    log: server.log,
    config: server.config,
    plugins: server.plugins,
  };

  const notificationSetup = new Plugin().setup(coreSetup, {});

  server.route(notificationSetup.getRoute());

  // expose the notification service for other plugins
  server.expose('notificationService', notificationSetup.getService());
}
