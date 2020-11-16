/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentPolicy, PackagePolicy } from '../../../../../../../common/types/models';
import {
  GetAgentPoliciesResponse,
  GetPackagePoliciesRequest,
} from '../../../../../../../common/types/rest_spec';
import { useGetPackagePolicies } from '../../../../hooks/use_request';
import {
  SendConditionalRequestConfig,
  useConditionalRequest,
} from '../../../../hooks/use_request/use_request';
import { agentPolicyRouteService } from '../../../../../../../common/services';
import { useEffect, useMemo, useState } from 'react';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../../../../../common/constants';

export interface PackagePolicyEnriched extends PackagePolicy {
  _agentPolicy: AgentPolicy | undefined;
}

/**
 * Works similar to `useGetAgentPolicies()`, except that it will add an additional property to
 * each package policy named `_agentPolicy` which may hold the Agent Policy associated with the
 * given package policy.
 * @param query
 */
const useGetEnrichedPackagePolicies = (query?: GetPackagePoliciesRequest['query']) => {
  const { data, error, isLoading: isLoadingPackagePolicies } = useGetPackagePolicies(query);

  const agentPoliciesFilter = useMemo<string>(() => {
    if (!data?.items.length) {
      return '';
    }
    // Build a list of package_policies for which we need Agent Policies for. Since some package
    // policies can exist within the same Agent Policy, we don't need to (in some cases) include
    // the entire list of package_policy ids.
    const includedAgentPolicies = new Set<string>();
    return `${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies: (${data.items
      .filter((packagePolicy) => {
        if (includedAgentPolicies.has(packagePolicy.policy_id)) {
          return false;
        }
        includedAgentPolicies.add(packagePolicy.policy_id);
        return true;
      })
      .join(' or ')})`;
  }, []);

  const { data: agentPoliciesData, isLoading: isLoadingAgentPolicies } = useConditionalRequest<
    GetAgentPoliciesResponse
  >({
    path: agentPolicyRouteService.getListPath(),
    method: 'get',
    query: {
      kuery: agentPoliciesFilter,
    },
    shouldSendRequest: !!data?.items.length,
  } as SendConditionalRequestConfig);

  const [enrichedData, setEnrichedData] = useState<PackagePolicyEnriched | undefined>();

  useEffect(() => {
    if (isLoadingPackagePolicies || isLoadingAgentPolicies) {
      return;
    }

    if (!!data?.items) {
      setEnrichedData([]);
      return;
    }

    const agentPoliciesById: Record<string, AgentPolicy> = {};

    if (agentPoliciesData?.items) {
      for (const agentPolicy of agentPoliciesData?.items) {
        agentPoliciesById[agentPolicy.id] = agentPolicy;
      }
    }

    setEnrichedData(
      data.items.map((packagePolicy) => {
        return {
          ...packagePolicy,
          _agentPolicy: agentPoliciesById[packagePolicy.policy_id],
        };
      })
    );
  }, []);

  return {
    data: enrichedData,
    error,
    isLoading: isLoadingPackagePolicies || isLoadingAgentPolicies,
  };
};
