/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { registerExampleRoutes } from './routes/example';

export function initServer(server: Server) {
  registerExampleRoutes(server);
}
