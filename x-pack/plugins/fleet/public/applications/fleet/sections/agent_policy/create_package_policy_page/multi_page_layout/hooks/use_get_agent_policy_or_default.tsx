/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';

import {
  sendCreateAgentPolicy,
  sendGetOneAgentPolicy,
  sendGetEnrollmentAPIKeys,
  useFleetStatus,
} from '../../../../../../../hooks';

import type { AgentPolicy, EnrollmentAPIKey } from '../../../../../../../types';

// Manual default space ID because importing from `@kbn/core-saved-objects-utils-server` is not allowed here
const DEFAULT_NAMESPACE_STRING = 'default';

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

export function useGetAgentPolicyOrDefault(agentPolicyIdIn?: string) {
  const { spaceId, isSpaceAwarenessEnabled } = useFleetStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [agentPolicyResponse, setAgentPolicyResponse] = useState<AgentPolicy>();
  const [enrollmentAPIKey, setEnrollmentAPIKey] = useState<EnrollmentAPIKey>();
  const [created, setCreated] = useState<boolean>();

  // If space awareness is enabled, append current space ID to the agent policy ID
  // If current space is the default space, do not append the space ID for BWC
  const defaultFirstPolicyIdBase = 'fleet-first-agent-policy';
  const defaultFirstPolicyId = useMemo(
    () =>
      isSpaceAwarenessEnabled && spaceId !== DEFAULT_NAMESPACE_STRING
        ? `${spaceId}:${defaultFirstPolicyIdBase}`
        : defaultFirstPolicyIdBase,
    [isSpaceAwarenessEnabled, spaceId]
  );

  const defaultFirstPolicy = useMemo(
    () =>
      Object.freeze(
        generateNewAgentPolicyWithDefaults({
          id: defaultFirstPolicyId,
          name: i18n.translate('xpack.fleet.createPackagePolicy.firstAgentPolicyNameText', {
            defaultMessage: 'My first agent policy',
          }),
        })
      ),
    [defaultFirstPolicyId]
  );

  useEffect(() => {
    const getAgentPolicyOrDefault = async () => {
      setIsLoading(true);

      const agentPolicyId = agentPolicyIdIn || defaultFirstPolicyId;
      const { data: agentPolicyData, error: getError } = await sendGetAgentPolicy(agentPolicyId);
      const existingAgentPolicy = agentPolicyData?.item;

      if (agentPolicyIdIn && !existingAgentPolicy) {
        setIsLoading(false);
        setError(new Error(`Agent policy ${agentPolicyId} not found`));
        return;
      }

      let createdAgentPolicy;

      if (getError) {
        setIsLoading(false);
        setError(getError);
        return;
      }

      if (!existingAgentPolicy) {
        const { data: createdAgentPolicyData, error: createError } =
          await sendCreateAgentPolicy.bind(null, defaultFirstPolicy)();

        if (createError) {
          setIsLoading(false);
          setError(createError);
          return;
        }

        createdAgentPolicy = createdAgentPolicyData!.item;
        setCreated(true);
      }

      const agentPolicy = (existingAgentPolicy || createdAgentPolicy) as AgentPolicy;
      setAgentPolicyResponse(agentPolicy);

      const { data: apiKeysData, error: apiKeysError } = await sendGetEnrollmentAPIKeys({
        page: 1,
        perPage: 1,
        kuery: `policy_id:"${agentPolicyId}"`,
      });

      if (apiKeysError) {
        setIsLoading(false);
        setError(apiKeysError);
        return;
      }

      if (!apiKeysData || !apiKeysData.items?.length) {
        setIsLoading(false);
        setError(new Error(`No enrollment API key found for policy ${agentPolicyId}`));
        return;
      }

      setIsLoading(false);
      setEnrollmentAPIKey(apiKeysData.items[0]);
    };

    getAgentPolicyOrDefault();
  }, [agentPolicyIdIn, defaultFirstPolicy, defaultFirstPolicyId]);

  return {
    isLoading,
    error,
    agentPolicy: agentPolicyResponse,
    enrollmentAPIKey,
    created,
  };
}
