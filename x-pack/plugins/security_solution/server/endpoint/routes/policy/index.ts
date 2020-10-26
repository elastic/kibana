/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../../types';
import {
  GetPolicyResponseSchema,
  GetPolicySummariesSchema,
} from '../../../../common/endpoint/schema/policy';
import { getHostPolicyResponseHandler, getPolicySummariesHandler } from './handlers';

export const BASE_POLICY_RESPONSE_ROUTE = `/api/endpoint/policy_response`;

export const BASE_POLICY_ROUTE = `/api/endpoint/policy`;

export const POLICY_SUMMARIES_ROUTE = `${BASE_POLICY_ROUTE}/summaries`;

export const INITIAL_POLICY_ID = '00000000-0000-0000-0000-000000000000';

export function registerPolicyRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.get(
    {
      path: BASE_POLICY_RESPONSE_ROUTE,
      validate: GetPolicyResponseSchema,
      options: { authRequired: true },
    },
    getHostPolicyResponseHandler(endpointAppContext)
  );

  router.get(
    {
      path: POLICY_SUMMARIES_ROUTE,
      validate: GetPolicySummariesSchema,
      options: { authRequired: true },
    },
    getPolicySummariesHandler(endpointAppContext)
  );
}
