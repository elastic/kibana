/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RequestHandler } from '@kbn/core/server';
import { ActionDetailsRequestSchema } from '../../../../common/api/endpoint';
import { ACTION_DETAILS_ROUTE } from '../../../../common/endpoint/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { getActionDetailsById } from '../../services';
import type { EndpointAppContext } from '../../types';
import { errorHandler } from '../error_handler';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers the route for handling retrieval of Action Details
 * @param router
 * @param endpointContext
 */
export const registerActionDetailsRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  // Details for a given action id
  router.versioned
    .get({
      access: 'public',
      path: ACTION_DETAILS_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: ActionDetailsRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        endpointContext.logFactory.get('hostIsolationDetails'),
        getActionDetailsRequestHandler(endpointContext)
      )
    );
};

export const getActionDetailsRequestHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof ActionDetailsRequestSchema.params>,
  never,
  never,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, req, res) => {
    try {
      return res.ok({
        body: {
          data: await getActionDetailsById(
            (await context.core).elasticsearch.client.asInternalUser,
            endpointContext.service.getEndpointMetadataService(),
            req.params.action_id
          ),
        },
      });
    } catch (error) {
      return errorHandler(endpointContext.logFactory.get('EndpointActionDetails'), res, error);
    }
  };
};
