/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type {
  UpdateWorkflowInsightsRequestBody,
  UpdateWorkflowInsightsRequestParams,
} from '../../../../common/api/endpoint/workflow_insights/update_insights';
import { UpdateWorkflowInsightRequestSchema } from '../../../../common/api/endpoint/workflow_insights/update_insights';
import { errorHandler } from '../error_handler';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';

export const registerUpdateInsightsRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .put({
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
          request: UpdateWorkflowInsightRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        endpointContext.logFactory.get('workflowInsights'),
        updateInsightsRouteHandler(endpointContext)
      )
    );
};

const updateInsightsRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  UpdateWorkflowInsightsRequestParams,
  unknown,
  UpdateWorkflowInsightsRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('workflowInsights');

  return async (context, request, response) => {
    const { insightId } = request.params;

    logger.debug(`Updating insight ${insightId}`);
    try {
      return response.ok({ body: { data: ['ok'] } });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
