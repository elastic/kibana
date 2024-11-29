/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunScriptActionRequestSchema } from '../../../../../common/api/endpoint/actions/response_actions/crowdstrike/run_script';
import { CROWDSTRIKE_RUN_SCRIPT_ROUTE } from '../../../../../common/endpoint/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { EndpointAppContext } from '../../../types';
import { withEndpointAuthz } from '../../with_endpoint_authz';
import { crowdStrikeActionRequestHandler } from './crowdstrike_actions_handler';

export function registerCrowdstrikeActionRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  const logger = endpointContext.logFactory.get('hostIsolation');

  router.versioned
    .post({
      access: 'public',
      path: CROWDSTRIKE_RUN_SCRIPT_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: RunScriptActionRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteExecuteOperations'] },
        logger,
        crowdStrikeActionRequestHandler(endpointContext, 'runscript')
      )
    );
}
