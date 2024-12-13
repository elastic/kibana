/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, RequestHandler } from '@kbn/core/server';
import type { GetWorkflowInsightsRequestQueryParams } from '../../../../common/api/endpoint/workflow_insights/workflow_insights';
import { GetWorkflowInsightsRequestSchema } from '../../../../common/api/endpoint/workflow_insights/workflow_insights';
import type {
  SearchParams,
  SecurityWorkflowInsight,
} from '../../../../common/endpoint/types/workflow_insights';
import { securityWorkflowInsightsService } from '../../services';
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

export const getInsightsRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  never,
  GetWorkflowInsightsRequestQueryParams,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('workflowInsights');

  return async (_, request, response): Promise<IKibanaResponse<SecurityWorkflowInsight[]>> => {
    try {
      logger.debug('Fetching workflow insights');

      const insightsResponse = await securityWorkflowInsightsService.fetch(
        request.query as SearchParams
      );

      const body = insightsResponse.flatMap((insight) => insight._source || []);

      return response.ok({ body });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
