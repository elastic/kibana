/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { GetWorkflowInsightsRequestQueryParams } from '../../../../common/api/endpoint/workflow_insights/get_insights';
import { GetWorkflowInsightsRequestSchema } from '../../../../common/api/endpoint/workflow_insights/get_insights';
import { errorHandler } from '../error_handler';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';

export const registerGetInsightsRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: WORKFLOW_INSIGHTS_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: GetWorkflowInsightsRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        endpointContext.logFactory.get('workflowInsights'),
        getInsightsRouteHandler(endpointContext)
      )
    );
};

const getInsightsRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  never,
  GetWorkflowInsightsRequestQueryParams,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('workflowInsights');

  return async (context, request, response) => {
    const { targetType: insightType, targetId: endpointId } = request.query;

    logger.debug(`Getting insights of type ${insightType} for endpoint ${endpointId} `);
    try {
      return response.ok({ body: { data: ['ok'] } });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
