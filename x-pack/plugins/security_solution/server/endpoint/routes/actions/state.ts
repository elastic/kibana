/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { ACTION_STATE_ROUTE } from '../../../../common/endpoint/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers routes for checking state of actions routes
 */
export function registerActionStateRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext,
  canEncrypt?: boolean
) {
  router.get(
    {
      path: ACTION_STATE_ROUTE,
      validate: false,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      {
        any: [
          'canIsolateHost',
          'canUnIsolateHost',
          'canKillProcess',
          'canSuspendProcess',
          'canGetRunningProcesses',
          'canAccessResponseConsole',
          'canWriteExecuteOperations',
          'canWriteFileOperations',
        ],
      },
      endpointContext.logFactory.get('actionState'),
      getActionStateRequestHandler(canEncrypt)
    )
  );
}

export const getActionStateRequestHandler = function (
  canEncrypt?: boolean
): RequestHandler<unknown, unknown, unknown, SecuritySolutionRequestHandlerContext> {
  return async (_, __, res) => {
    return res.ok({
      body: {
        data: { canEncrypt },
      },
    });
  };
};
