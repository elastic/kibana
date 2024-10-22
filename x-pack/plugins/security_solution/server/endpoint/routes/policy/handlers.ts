/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import { errorHandler } from '../error_handler';
import type {
  GetPolicyResponseSchema,
  GetAgentPolicySummaryRequestSchema,
} from '../../../../common/api/endpoint';
import type { EndpointAppContext } from '../../types';
import { getAgentPolicySummary, getPolicyResponseByAgentId } from './service';
import type { GetAgentSummaryResponse } from '../../../../common/endpoint/types';
import { NotFoundError } from '../../errors';

export const getHostPolicyResponseHandler = function (
  endpointAppContextServices: EndpointAppContextService
): RequestHandler<
  never,
  TypeOf<typeof GetPolicyResponseSchema.query>,
  never,
  SecuritySolutionRequestHandlerContext
> {
  const logger = endpointAppContextServices.createLogger('endpointPolicyResponse');

  return async (context, request, response) => {
    const spaceId = (await context.securitySolution).getSpaceId();
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const fleetServices = endpointAppContextServices.getInternalFleetServices(spaceId);

    try {
      const agentId = request.query.agentId;
      const doc = await getPolicyResponseByAgentId(agentId, esClient, fleetServices);

      if (doc) {
        return response.ok({ body: doc });
      }

      logger.debug(`Agent id [${agentId}] has no policy response documents indexed yet`);

      throw new NotFoundError(`Policy response for endpoint id [${agentId}] not found`);
    } catch (err) {
      return errorHandler(logger, response, err);
    }
  };
};

export const getAgentPolicySummaryHandler = function (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, TypeOf<typeof GetAgentPolicySummaryRequestSchema.query>, undefined> {
  return async (_, request, response) => {
    const result = await getAgentPolicySummary(
      endpointAppContext,
      request,
      request.query.package_name,
      request.query?.policy_id || undefined
    );
    const responseBody = {
      package: request.query.package_name,
      versions_count: { ...result },
    };

    const body: GetAgentSummaryResponse = {
      summary_response: request.query?.policy_id
        ? { ...responseBody, ...{ policy_id: request.query?.policy_id } }
        : responseBody,
    };

    return response.ok({
      body,
    });
  };
};
