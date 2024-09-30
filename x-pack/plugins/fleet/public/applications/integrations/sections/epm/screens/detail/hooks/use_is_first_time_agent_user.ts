/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FLEET_SERVER_PACKAGE,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../../../../../common/constants';
import { useAuthz, useGetAgentsQuery, useGetPackagePoliciesQuery } from '../../../../../hooks';

interface UseIsFirstTimeAgentUserResponse {
  isFirstTimeAgentUser?: boolean;
  isLoading?: boolean;
}

export const useIsFirstTimeAgentUserQuery = (): UseIsFirstTimeAgentUserResponse => {
  const authz = useAuthz();
  const {
    data: packagePolicies,
    isLoading: areAgentPoliciesLoading,
    isFetched: areAgentsFetched,
  } = useGetPackagePoliciesQuery(
    {
      kuery: `${LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_SERVER_PACKAGE}`,
    },
    {
      enabled: authz.fleet.readAgentPolicies,
    }
  );

  const policyIds = [...new Set(packagePolicies?.items.flatMap((item) => item.policy_ids) ?? [])];

  // now get all agents that are NOT part of a fleet server policy
  const serverPolicyIdsQuery = policyIds.map((policyId) => `policy_id:${policyId}`).join(' or ');

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
    isFirstTimeAgentUser: authz.fleet.readAgentPolicies && agents?.data?.total === 0,
  };
};
