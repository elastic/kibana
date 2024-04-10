/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { getAgentStatusClient } from '../../services';
import { errorHandler } from '../error_handler';
import type { EndpointAgentStatusRequestQueryParams } from '../../../../common/api/endpoint/agent/get_agent_status_route';
import { EndpointAgentStatusRequestSchema } from '../../../../common/api/endpoint/agent/get_agent_status_route';
import { AGENT_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';

export const registerAgentStatusRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: AGENT_STATUS_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: EndpointAgentStatusRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        endpointContext.logFactory.get('agentStatusRoute'),
        getAgentStatusRouteHandler(endpointContext)
      )
    );
};

export const getAgentStatusRouteHandler = (
  endpointContext: EndpointAppContext
): RequestHandler<
  never,
  EndpointAgentStatusRequestQueryParams,
  unknown,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointContext.logFactory.get('agentStatus');

  return async (context, request, response) => {
    const { agentType = 'endpoint', agentIds: _agentIds } = request.query;
    const agentIds = Array.isArray(_agentIds) ? _agentIds : [_agentIds];

    // Note:  because our API schemas are defined as module static variables (as opposed to a
    //        `getter` function), we need to include this additional validation here, since
    //        `agentType` is included in the schema independent of the feature flag
    if (
      !endpointContext.experimentalFeatures.responseActionsSentinelOneV1Enabled &&
      agentType === 'sentinel_one'
    ) {
      return errorHandler(
        logger,
        response,
        new CustomHttpRequestError(`[request query.agentType]: feature is disabled`, 400)
      );
    }

    logger.debug(
      `Retrieving status for: agentType [${agentType}], agentIds: [${agentIds.join(', ')}]`
    );

    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const agentStatusClient = getAgentStatusClient(agentType, {
      esClient,
      endpointService: endpointContext.service,
    });

    try {
      return response.ok({
        body: {
          data: await agentStatusClient.getAgentStatuses(agentIds),
        },
      });
    } catch (e) {
      return errorHandler(logger, response, e);
    }
  };
};
