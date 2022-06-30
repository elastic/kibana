/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { sendGetAgentPolicies, sendGetAgents } from '../../../../../hooks';
import { policyHasFleetServer } from '../../../../../services';

interface UseIsFirstTimeAgentUserResponse {
  isLoading: boolean;
  isFirstTimeAgentUser?: boolean;
}

export const useIsFirstTimeAgentUser = (): UseIsFirstTimeAgentUserResponse => {
  const [result, setResult] = useState<UseIsFirstTimeAgentUserResponse>({ isLoading: true });
  useEffect(() => {
    if (!result.isLoading) {
      return;
    }

    const getIsFirstTimeAgentUser = async () => {
      const { data: agentPoliciesData } = await sendGetAgentPolicies({
        full: true,
      });

      // now get all agents that are NOT part of a fleet server policy
      const serverPolicyIdsQuery = (agentPoliciesData?.items || [])
        .filter((item) => policyHasFleetServer(item))
        .map((p) => `policy_id:${p.id}`)
        .join(' or ');

      // get agents that are not unenrolled and not fleet server
      const kuery =
        `not (_exists_:"unenrolled_at")` +
        (serverPolicyIdsQuery.length ? ` and not (${serverPolicyIdsQuery})` : '');

      const { data: agentStatusData } = await sendGetAgents({
        page: 1,
        perPage: 1, // we only need to know if there is at least one non-fleet agent
        showInactive: true,
        kuery,
      });
      setResult({ isLoading: false, isFirstTimeAgentUser: agentStatusData?.total === 0 });
    };

    getIsFirstTimeAgentUser();
  }, [result]);

  return result;
};
