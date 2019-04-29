/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import mappings from './mappings.json';
import { AlertingService, createActionRoute } from './server';

import { APP_ID } from './common/constants';

export function alerting(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    require: ['kibana', 'elasticsearch'],
    init(server: Hapi.Server) {
      const alertingService = new AlertingService();
      // Routes
      createActionRoute(server);
      // Register service to server
      server.decorate('server', 'alerting', () => alertingService);
    },
    uiExports: {
      mappings,
    },
  });
}
