/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'src/server/kbn_server';
import { registerClusterCheckupRoutes } from './routes/cluster_checkup';
import { registerDeprecationLoggingRoutes } from './routes/deprecation_logging';
import { registerReindexTemplateRoutes } from './routes/reindex_templates';

export function initServer(server: Server) {
  registerClusterCheckupRoutes(server);
  registerDeprecationLoggingRoutes(server);
  registerReindexTemplateRoutes(server);
}
