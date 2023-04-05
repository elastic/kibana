/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HostPolicyResponse } from '../types';
import { wrapErrorAndRejectPromise } from './utils';
import { POLICY_RESPONSE_INDEX } from '../constants';

interface IndexEndpointPolicyResponseOutput {
  policyResponses: HostPolicyResponse[];
}

export const indexEndpointPolicyResponse = async (
  esClient: Client,
  policyResponse: HostPolicyResponse
): Promise<IndexEndpointPolicyResponseOutput> => {
  await esClient
    .index({
      index: POLICY_RESPONSE_INDEX,
      body: policyResponse,
      op_type: 'create',
      refresh: 'wait_for',
    })
    .catch(wrapErrorAndRejectPromise);

  const response: IndexEndpointPolicyResponseOutput = {
    policyResponses: [policyResponse],
  };

  return response;
};
