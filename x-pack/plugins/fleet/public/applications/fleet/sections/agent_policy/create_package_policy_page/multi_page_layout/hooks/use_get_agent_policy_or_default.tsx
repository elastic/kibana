/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  sendCreateAgentPolicy,
  sendGetOneAgentPolicy,
  sendGetEnrollmentAPIKeys,
} from '../../../../../../../hooks';

import { generateNewAgentPolicyWithDefaults } from '../../../../../../../services';

import type { AgentPolicy, NewAgentPolicy, EnrollmentAPIKey } from '../../../../../../../types';

interface UseGetAgentPolicyOrDefaultResponse {
  isLoading: boolean;
  error?: Error;
  agentPolicy?: AgentPolicy;
  enrollmentAPIKey?: EnrollmentAPIKey;
  created?: boolean;
}
export const DEFAULT_AGENT_POLICY_ID: string = 'fleet-first-agent-policy';
export const DEFAULT_AGENT_POLICY: NewAgentPolicy = Object.freeze(
  generateNewAgentPolicyWithDefaults({
    id: DEFAULT_AGENT_POLICY_ID,
    name: i18n.translate('xpack.fleet.createPackagePolicy.firstAgentPolicyNameText', {
      defaultMessage: 'My first agent policy',
    }),
  })
);

const sendGetAgentPolicy = async (agentPolicyId: string) => {
  let result;
  let error;
  try {
    result = await sendGetOneAgentPolicy(agentPolicyId);
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

export function useGetAgentPolicyOrDefault(agentPolicyIdIn?: string) {
  const [result, setResult] = useState<UseGetAgentPolicyOrDefaultResponse>({ isLoading: true });

  useEffect(() => {
    const getAgentPolicyOrDefault = async () => {
      const agentPolicyId = agentPolicyIdIn || DEFAULT_AGENT_POLICY_ID;
      const { data: agentPolicyData, error: getError } = await sendGetAgentPolicy(agentPolicyId);

      const existingAgentPolicy = agentPolicyData?.item;

      if (agentPolicyIdIn && !existingAgentPolicy) {
        setResult({
          isLoading: false,
          error: new Error(`Agent policy ${agentPolicyId} not found`),
        });
        return;
      }
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
        kuery: `policy_id:${agentPolicyId}`,
      });

      if (apiKeysError) {
        setResult({ isLoading: false, error: apiKeysError });
        return;
      }

      if (!apiKeysData || !apiKeysData.items?.length) {
        setResult({
          isLoading: false,
          error: new Error(`No enrollment API key found for policy ${agentPolicyId}`),
        });
        return;
      }

      const enrollmentAPIKey = apiKeysData.items[0];

      setResult({ isLoading: false, created: !!createdAgentPolicy, agentPolicy, enrollmentAPIKey });
    };

    getAgentPolicyOrDefault();
  }, [agentPolicyIdIn]);

  return result;
}
