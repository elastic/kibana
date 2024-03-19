/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAuthz, useGetAgentPoliciesQuery, useGetAgentsQuery } from '../../../../../hooks';
import { policyHasFleetServer } from '../../../../../services';

interface UseIsFirstTimeAgentUserResponse {
  isFirstTimeAgentUser?: boolean;
  isLoading?: boolean;
}

export const useIsFirstTimeAgentUserQuery = (): UseIsFirstTimeAgentUserResponse => {
  const authz = useAuthz();
  const {
    data: agentPolicies,
    isLoading: areAgentPoliciesLoading,
    isFetched: areAgentsFetched,
  } = useGetAgentPoliciesQuery(
    {
      full: true,
    },
    {
      enabled: authz.fleet.readAgentPolicies,
    }
  );

  // now get all agents that are NOT part of a fleet server policy
  const serverPolicyIdsQuery = (agentPolicies?.items || [])
    .filter((item) => policyHasFleetServer(item))
    .map((p) => `policy_id:${p.id}`)
    .join(' or ');

  // get agents that are not unenrolled and not fleet server
  const kuery =
    `not (_exists_:"unenrolled_at")` +
    (serverPolicyIdsQuery.length ? ` and not (${serverPolicyIdsQuery})` : '');

  const { data: agents, isLoading: areAgentsLoading } = useGetAgentsQuery(
    {
      page: 1,
      perPage: 1, // we only need to know if there is at least one non-fleet agent
      showInactive: true,
      kuery,
    },
    { enabled: areAgentsFetched } // don't run the query until agent policies are loaded
  );

  return {
    isLoading: authz.fleet.readAgentPolicies && (areAgentPoliciesLoading || areAgentsLoading),
    isFirstTimeAgentUser: !authz.fleet.readAgentPolicies && agents?.data?.total === 0,
  };
};
