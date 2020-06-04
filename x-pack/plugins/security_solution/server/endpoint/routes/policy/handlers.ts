/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { GetPolicyResponseSchema } from '../../../../common/endpoint/schema/policy';
import { EndpointAppContext } from '../../types';
import { getPolicyResponseByHostId } from './service';

export const getHostPolicyResponseHandler = function (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, TypeOf<typeof GetPolicyResponseSchema.query>, undefined> {
  return async (context, request, response) => {
    try {
      const index = await endpointAppContext.service
        .getIndexPatternRetriever()
        .getPolicyResponseIndexPattern(context);

      const doc = await getPolicyResponseByHostId(
        index,
        request.query.hostId,
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
