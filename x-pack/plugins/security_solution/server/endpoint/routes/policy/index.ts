/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../../types';
import {
  GetPolicyResponseSchema,
  GetAgentPolicySummaryRequestSchema,
} from '../../../../common/endpoint/schema/policy';
import { getHostPolicyResponseHandler, getAgentPolicySummaryHandler } from './handlers';
import {
  AGENT_POLICY_SUMMARY_ROUTE,
  BASE_POLICY_RESPONSE_ROUTE,
} from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';

export const INITIAL_POLICY_ID = '00000000-0000-0000-0000-000000000000';

export function registerPolicyRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const logger = endpointAppContext.logFactory.get('endpointPolicy');

  router.get(
    {
      path: BASE_POLICY_RESPONSE_ROUTE,
      validate: GetPolicyResponseSchema,
      options: { authRequired: true },
    },
    withEndpointAuthz(
      { all: ['canAccessEndpointManagement'] },
      logger,
      getHostPolicyResponseHandler()
    )
  );

  router.get(
    {
      path: AGENT_POLICY_SUMMARY_ROUTE,
      validate: GetAgentPolicySummaryRequestSchema,
      options: { authRequired: true },
    },
    withEndpointAuthz(
      { all: ['canAccessEndpointManagement'] },
      logger,
      getAgentPolicySummaryHandler(endpointAppContext)
    )
  );
}
