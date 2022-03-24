/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from 'kibana/public';
import {
  PostTrustedAppCreateRequest,
  PutTrustedAppUpdateRequest,
} from '../../../../../common/endpoint/types';
import { HttpRequestValidationError } from './errors';
import { sendGetAgentPolicyList } from '../../policy/store/services/ingest';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../../../../fleet/common';

/**
 * Validates that the Trusted App is valid for sending to the API (`POST` + 'PUT')
 *
 * @throws
 */
export const validateTrustedAppHttpRequestBody = async (
  http: HttpStart,
  trustedApp: PostTrustedAppCreateRequest | PutTrustedAppUpdateRequest
): Promise<void> => {
  const failedValidations: string[] = [];

  // Validate that the Policy IDs are still valid
  if (trustedApp.effectScope.type === 'policy' && trustedApp.effectScope.policies.length) {
    const policyIds = trustedApp.effectScope.policies;

    // We can't search against the Package Policy API by ID because there is no way to do that.
    // So, as a work-around, we use the Agent Policy API and check for those Agent Policies that
    // have these package policies in it. For endpoint, these are 1-to-1.
    const agentPoliciesFound = await sendGetAgentPolicyList(http, {
      query: {
        kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies: (${policyIds.join(' or ')})`,
      },
    });

    if (!agentPoliciesFound.items.length) {
      failedValidations.push(`Invalid Policy Id(s) [${policyIds.join(', ')}]`);
    } else {
      const missingPolicies = policyIds.filter(
        (policyId) =>
          !agentPoliciesFound.items.find(({ package_policies: packagePolicies }) =>
            (packagePolicies as string[]).includes(policyId)
          )
      );

      if (missingPolicies.length) {
        failedValidations.push(`Invalid Policy Id(s) [${missingPolicies.join(', ')}]`);
      }
    }
  }

  if (failedValidations.length) {
    throw new HttpRequestValidationError(failedValidations);
  }
};
