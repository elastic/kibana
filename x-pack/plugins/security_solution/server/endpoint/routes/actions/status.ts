/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { TypeOf } from '@kbn/config-schema';
import {
  ActionDetailsRequestSchema,
  ActionStatusRequestSchema,
} from '../../../../common/endpoint/schema/actions';
import { ACTION_DETAILS_ROUTE, ACTION_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { EndpointAppContext } from '../../types';
import { getActionDetailsById, getPendingActionCounts } from '../../services';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers routes for checking status of actions
 */
export function registerActionStatusRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  // Summary of action status f for a given list of endpoints
  router.get(
    {
      path: ACTION_STATUS_ROUTE,
      validate: ActionStatusRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canAccessEndpointManagement'] },
      endpointContext.logFactory.get('hostIsolationStatus'),
      actionStatusRequestHandler(endpointContext)
    )
  );

  // Details for a given action id
  router.get(
    {
      path: ACTION_DETAILS_ROUTE,
      validate: ActionDetailsRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canAccessEndpointManagement'] },
      endpointContext.logFactory.get('hostIsolationDetails'),
      getActionDetailsRequestHandler()
    )
  );
}

export const getActionDetailsRequestHandler = (): RequestHandler<
  TypeOf<typeof ActionDetailsRequestSchema.params>,
  never,
  never,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, req, res) => {
    return res.ok({
      body: {
        data: await getActionDetailsById(
          context.core.elasticsearch.client.asInternalUser,
          req.params.action_id
        ),
      },
    });
  };
};

export const actionStatusRequestHandler = function (
  endpointContext: EndpointAppContext
): RequestHandler<
  unknown,
  TypeOf<typeof ActionStatusRequestSchema.query>,
  unknown,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, req, res) => {
    const esClient = context.core.elasticsearch.client.asInternalUser;
    const agentIDs: string[] = Array.isArray(req.query.agent_ids)
      ? [...new Set(req.query.agent_ids)]
      : [req.query.agent_ids];

    const response = await getPendingActionCounts(
      esClient,
      endpointContext.service.getEndpointMetadataService(),
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
