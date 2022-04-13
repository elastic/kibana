/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { policyIndexPattern } from '../../../../common/endpoint/constants';
import {
  GetPolicyResponseSchema,
  GetAgentPolicySummaryRequestSchema,
} from '../../../../common/endpoint/schema/policy';
import { EndpointAppContext } from '../../types';
import { getAgentPolicySummary, getPolicyResponseByAgentId } from './service';
import { GetAgentSummaryResponse } from '../../../../common/endpoint/types';

export const getHostPolicyResponseHandler = function (): RequestHandler<
  undefined,
  TypeOf<typeof GetPolicyResponseSchema.query>,
  undefined
> {
  return async (context, request, response) => {
    const client = (await context.core).elasticsearch.client;
    const doc = await getPolicyResponseByAgentId(policyIndexPattern, request.query.agentId, client);

    if (doc) {
      return response.ok({ body: doc });
    }

    return response.notFound({ body: 'Policy Response Not Found' });
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
