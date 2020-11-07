/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { policyIndexPattern } from '../../../../common/endpoint/constants';
import {
  GetPolicyResponseSchema,
  GetPolicySummariesSchema,
} from '../../../../common/endpoint/schema/policy';
import { EndpointAppContext } from '../../types';
import { getAllAgentUniqueVersionCount, getPolicyResponseByAgentId } from './service';

export const getHostPolicyResponseHandler = function (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, TypeOf<typeof GetPolicyResponseSchema.query>, undefined> {
  return async (context, request, response) => {
    try {
      const doc = await getPolicyResponseByAgentId(
        policyIndexPattern,
        request.query.agentId,
        context.core.elasticsearch.legacy.client
      );

      if (doc) {
        return response.ok({ body: doc });
      }

      return response.notFound({ body: 'Policy Response Not Found' });
    } catch (err) {
      return response.internalError({ body: err });
    }
  };
};

export const getPolicySummariesHandler = function (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, TypeOf<typeof GetPolicySummariesSchema.query>, undefined> {
  return async (context, request, response) => {
    try {
      const result = await getAllAgentUniqueVersionCount(
        endpointAppContext,
        context.core.savedObjects.client,
        request.query.package_name,
        request.query?.policy_name || undefined
      );
      const responseBody = {
        package: request.query.package_name,
        versions_count: { ...result },
      };

      return response.ok({
        body: request.query?.policy_name
          ? { ...responseBody, ...{ policy_name: request.query?.policy_name } }
          : responseBody,
      });
    } catch (err) {
      return response.internalError({ body: err });
    }
  };
};
