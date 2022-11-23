/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerActionFileInfoRoute } from './file_info_handler';
import { registerActionFileDownloadRoutes } from './file_download_handler';
import { registerActionDetailsRoutes } from './details';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';
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

  // APIs specific to `get-file` are behind FF
  if (endpointContext.experimentalFeatures.responseActionGetFileEnabled) {
    registerActionFileDownloadRoutes(router, endpointContext);
    registerActionFileInfoRoute(router, endpointContext);
  }
}
