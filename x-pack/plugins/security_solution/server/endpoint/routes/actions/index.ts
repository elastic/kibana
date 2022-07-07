/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerActionDetailsRoutes } from './details';
import { SecuritySolutionPluginRouter } from '../../../types';
import { EndpointAppContext } from '../../types';
import { registerActionStatusRoutes } from './status';
import { registerActionAuditLogRoutes } from './audit_log';
import { registerActionListRoutes } from './list';
import { registerResponseActionRoutes } from './response_actions';

// wrap route registration

export function registerActionRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  registerActionStatusRoutes(router, endpointContext);
  registerActionAuditLogRoutes(router, endpointContext);
  registerActionListRoutes(router, endpointContext);
  registerActionDetailsRoutes(router, endpointContext);
  registerResponseActionRoutes(router, endpointContext);
}
