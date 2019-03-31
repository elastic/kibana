/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Plugin } from './server/plugin';

/**
 * Initialize the Action Service with various actions provided by X-Pack, when configured.
 *
 * @param server {Object} HapiJS server instance
 */
export function init(legacyServer: Legacy.Server): void {
  const coreSetup = {
    log: legacyServer.log,
    config: legacyServer.config,
    plugins: legacyServer.plugins,
  };

  const notificationSetup = new Plugin().setup(coreSetup, {});

  legacyServer.route(notificationSetup.getRoute());

  // expose the notification service for other plugins
  legacyServer.expose('notificationService', notificationSetup.getService());
}
