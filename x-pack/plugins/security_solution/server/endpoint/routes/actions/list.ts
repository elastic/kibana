/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINTS_ACTIONS_LOG_ROUTE } from '../../../../common/endpoint/constants';
import { AgentsActionsLogRequestSchema } from '../../../../common/endpoint/schema/actions';
import { actionListHandler } from './list_handler';

import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers the endpoint activity_log route
 */
export function registerActionListRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  router.get(
    {
      path: ENDPOINTS_ACTIONS_LOG_ROUTE,
      validate: AgentsActionsLogRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canIsolateHost'] },
      endpointContext.logFactory.get('endpointActionsLog'),
      actionListHandler(endpointContext)
    )
  );
}
