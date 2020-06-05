/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../../types';
import { GetPolicyResponseSchema } from '../../../../common/endpoint/schema/policy';
import { getHostPolicyResponseHandler } from './handlers';

export const BASE_POLICY_RESPONSE_ROUTE = `/api/endpoint/policy_response`;

export function registerPolicyRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.get(
    {
      path: BASE_POLICY_RESPONSE_ROUTE,
      validate: GetPolicyResponseSchema,
      options: { authRequired: true },
    },
    getHostPolicyResponseHandler(endpointAppContext)
  );
}
