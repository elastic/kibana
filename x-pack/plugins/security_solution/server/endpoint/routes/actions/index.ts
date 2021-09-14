/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySolutionPluginRouter } from '../../../types';
import { EndpointAppContext } from '../../types';
import { registerHostIsolationRoutes } from './isolation';
import { registerActionStatusRoutes } from './status';
import { registerActionAuditLogRoutes } from './audit_log';

export * from './isolation';

// wrap route registration

export function registerActionRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  registerHostIsolationRoutes(router, endpointContext);
  registerActionStatusRoutes(router, endpointContext);
  registerActionAuditLogRoutes(router, endpointContext);
}
