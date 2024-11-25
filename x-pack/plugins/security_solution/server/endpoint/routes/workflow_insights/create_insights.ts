/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { DefendInsightTypeEnum } from '@kbn/elastic-assistant-common';
import type { CreateWorkflowInsightsRequestBody } from '../../../../common/api/endpoint/workflow_insights/create_insights';
import { CreateWorkflowInsightsRequestSchema } from '../../../../common/api/endpoint/workflow_insights/create_insights';
import { errorHandler } from '../error_handler';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';

export const registerCreateInsightsRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .post({
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
          request: CreateWorkflowInsightsRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        endpointContext.logFactory.get('workflowInsights'),
        createInsightsRouteHandler(endpointContext)
      )
    );
};

const createInsightsRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  never,
  unknown,
  CreateWorkflowInsightsRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('workflowInsights');

  return async (context, request, response) => {
    const { insightType } = request.body;

    if (insightType !== DefendInsightTypeEnum.incompatible_antivirus) {
      return response.customError({
        statusCode: 400,
        body: { message: `Unsupported insight type ${insightType}` },
      });
    }

    try {
      return response.ok({ body: { data: ['ok'] } });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
