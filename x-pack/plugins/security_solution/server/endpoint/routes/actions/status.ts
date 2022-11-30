/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { ActionStatusRequestSchema } from '../../../../common/endpoint/schema/actions';
import { ACTION_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { getPendingActionsSummary } from '../../services';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers routes for checking status of actions
 */
export function registerActionStatusRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  // Summary of action status for a given list of endpoints
  router.get(
    {
      path: ACTION_STATUS_ROUTE,
      validate: ActionStatusRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canReadSecuritySolution'] },
      endpointContext.logFactory.get('hostIsolationStatus'),
      actionStatusRequestHandler(endpointContext)
    )
  );
}

export const actionStatusRequestHandler = function (
  endpointContext: EndpointAppContext
): RequestHandler<
  unknown,
  TypeOf<typeof ActionStatusRequestSchema.query>,
  unknown,
  SecuritySolutionRequestHandlerContext
> {
  const logger = endpointContext.logFactory.get('actionStatusApi');

  return async (context, req, res) => {
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const agentIDs: string[] = Array.isArray(req.query.agent_ids)
      ? [...new Set(req.query.agent_ids)]
      : [req.query.agent_ids];

    const response = await getPendingActionsSummary(
      esClient,
      endpointContext.service.getEndpointMetadataService(),
      logger,
      agentIDs,
      endpointContext.experimentalFeatures.pendingActionResponsesWithAck
    );

    return res.ok({
      body: {
        data: response,
      },
    });
  };
};
