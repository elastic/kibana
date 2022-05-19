/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import {
  sendCreateAgentPolicy,
  sendGetOneAgentPolicy,
  sendGetEnrollmentAPIKeys,
} from '../../../../../../hooks';

import type { AgentPolicy, NewAgentPolicy, EnrollmentAPIKey } from '../../../../../../types';

interface UseEnsureDefaultAgentPolicyResponse {
  isLoading: boolean;
  error?: Error;
  agentPolicy?: AgentPolicy;
  enrollmentAPIKey?: EnrollmentAPIKey;
  created?: boolean;
}
// TODO: decide sensible default
export const DEFAULT_AGENT_POLICY_ID: string = 'fleet-first-agent-policy';
export const DEFAULT_AGENT_POLICY: NewAgentPolicy = Object.freeze({
  id: DEFAULT_AGENT_POLICY_ID,
  name: 'My first agent policy :)',
  namespace: 'default',
});

const sendGetDefaultAgentPolicy = async () => {
  let result;
  let error;
  try {
    result = await sendGetOneAgentPolicy(DEFAULT_AGENT_POLICY_ID);
    if (result.error) {
      error = result.error;
    }
  } catch (e) {
    error = e;
  }

  if (error && error.statusCode !== 404) {
    return { error };
  }

  return { data: result?.data };
};

const sendCreateDefaultAgentPolicy = sendCreateAgentPolicy.bind(null, DEFAULT_AGENT_POLICY);

export function useEnsureDefaultAgentPolicy() {
  const [result, setResult] = useState<UseEnsureDefaultAgentPolicyResponse>({ isLoading: true });

  useEffect(() => {
    const ensureDefaultAgentPolicy = async () => {
      const { data: agentPolicyData, error: getError } = await sendGetDefaultAgentPolicy();

      const existingAgentPolicy = agentPolicyData?.item;
      let createdAgentPolicy;
      if (getError) {
        setResult({ isLoading: false, error: getError });
        return;
      }

      if (!existingAgentPolicy) {
        const { data: createdAgentPolicyData, error: createError } =
          await sendCreateDefaultAgentPolicy();

        if (createError) {
          setResult({ isLoading: false, error: createError });
          return;
        }

        createdAgentPolicy = createdAgentPolicyData!.item;
      }

      const agentPolicy = (existingAgentPolicy || createdAgentPolicy) as AgentPolicy;

      const { data: apiKeysData, error: apiKeysError } = await sendGetEnrollmentAPIKeys({
        page: 1,
        perPage: 1,
        kuery: `policy_id:${DEFAULT_AGENT_POLICY_ID}`,
      });

      if (apiKeysError) {
        setResult({ isLoading: false, error: apiKeysError });
        return;
      }

      if (!apiKeysData || !apiKeysData.items?.length) {
        setResult({
          isLoading: false,
          error: new Error(`No enrollment API key found for policy ${DEFAULT_AGENT_POLICY_ID}`),
        });
        return;
      }

      const enrollmentAPIKey = apiKeysData.items[0];

      setResult({ isLoading: false, created: !!createdAgentPolicy, agentPolicy, enrollmentAPIKey });
    };

    ensureDefaultAgentPolicy();
  }, []);

  return result;
}
