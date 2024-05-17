/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { registerActionAuditLogRoutes } from './audit_log';
import { registerActionDetailsRoutes } from './details';
import { registerActionFileDownloadRoutes } from './file_download_handler';
import { registerActionFileInfoRoute } from './file_info_handler';
import { registerActionListRoutes } from './list';
import { registerResponseActionRoutes } from './response_actions';
import { registerActionStateRoutes } from './state';
import { registerActionStatusRoutes } from './status';

// wrap route registration

export function registerActionRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext,
  canEncrypt?: boolean
) {
  registerActionStatusRoutes(router, endpointContext);
  registerActionStateRoutes(router, endpointContext, canEncrypt);
  registerActionAuditLogRoutes(router, endpointContext);
  registerActionListRoutes(router, endpointContext);
  registerActionDetailsRoutes(router, endpointContext);
  registerResponseActionRoutes(router, endpointContext);
  registerActionFileDownloadRoutes(router, endpointContext);
  registerActionFileInfoRoute(router, endpointContext);
}
