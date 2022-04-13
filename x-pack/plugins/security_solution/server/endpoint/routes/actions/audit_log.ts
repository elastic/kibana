/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ACTION_LOG_ROUTE } from '../../../../common/endpoint/constants';
import { EndpointActionLogRequestSchema } from '../../../../common/endpoint/schema/actions';
import { actionsLogRequestHandler } from './audit_log_handler';

import { SecuritySolutionPluginRouter } from '../../../types';
import { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers the endpoint activity_log route
 */
export function registerActionAuditLogRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  router.get(
    {
      path: ENDPOINT_ACTION_LOG_ROUTE,
      validate: EndpointActionLogRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canIsolateHost'] },
      endpointContext.logFactory.get('hostIsolationLogs'),
      actionsLogRequestHandler(endpointContext)
    )
  );
}
