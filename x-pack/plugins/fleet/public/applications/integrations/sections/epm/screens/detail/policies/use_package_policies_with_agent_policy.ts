/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import type {
  PackagePolicy,
  GetAgentPoliciesResponse,
  GetAgentPoliciesResponseItem,
  GetPackagePoliciesResponse,
} from '../../../../../types';
import { agentPolicyRouteService } from '../../../../../services';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../../../constants';
import { useGetPackagePolicies, useConditionalRequest } from '../../../../../hooks';
import type { SendConditionalRequestConfig } from '../../../../../hooks';

export interface PackagePolicyEnriched extends PackagePolicy {
  _agentPolicy: GetAgentPoliciesResponseItem | undefined;
}

export interface PackagePolicyAndAgentPolicy {
  packagePolicy: PackagePolicy;
  agentPolicy: GetAgentPoliciesResponseItem;
}

type GetPackagePoliciesWithAgentPolicy = Omit<GetPackagePoliciesResponse, 'items'> & {
  items: PackagePolicyAndAgentPolicy[];
};

/**
 * Works similar to `useGetAgentPolicies()`, except that it will add an additional property to
 * each package policy named `_agentPolicy` which may hold the Agent Policy associated with the
 * given package policy.
 * @param query
 */
export const usePackagePoliciesWithAgentPolicy = (
  query: Parameters<typeof useGetPackagePolicies>[0]
): {
  isLoading: boolean;
  error: Error | null;
  data?: GetPackagePoliciesWithAgentPolicy;
  resendRequest: () => void;
} => {
  const {
    data: packagePoliciesData,
    error,
    isLoading: isLoadingPackagePolicies,
    resendRequest,
  } = useGetPackagePolicies(query);

  const agentPoliciesFilter = useMemo<string>(() => {
    if (!packagePoliciesData?.items.length) {
      return '';
    }

    // Build a list of package_policies for which we need Agent Policies for. Since some package
    // policies can exist within the same Agent Policy, we don't need to (in some cases) include
    // the entire list of package_policy ids.
    const includedAgentPolicies = new Set<string>();

    return `${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies: (${packagePoliciesData.items
      .filter((packagePolicy) => {
        if (includedAgentPolicies.has(packagePolicy.policy_id)) {
          return false;
        }
        includedAgentPolicies.add(packagePolicy.policy_id);
        return true;
      })
      .map((packagePolicy) => packagePolicy.id)
      .join(' or ')}) `;
  }, [packagePoliciesData]);

  const {
    data: agentPoliciesData,
    isLoading: isLoadingAgentPolicies,
  } = useConditionalRequest<GetAgentPoliciesResponse>({
    path: agentPolicyRouteService.getListPath(),
    method: 'get',
    query: {
      perPage: 100,
      kuery: agentPoliciesFilter,
    },
    shouldSendRequest: !!packagePoliciesData?.items.length,
  } as SendConditionalRequestConfig);

  const [enrichedData, setEnrichedData] = useState<GetPackagePoliciesWithAgentPolicy | undefined>();

  useEffect(() => {
    if (isLoadingPackagePolicies || isLoadingAgentPolicies) {
      return;
    }

    if (!packagePoliciesData?.items) {
      setEnrichedData(undefined);
      return;
    }

    const agentPoliciesById: Record<string, GetAgentPoliciesResponseItem> = {};

    if (agentPoliciesData?.items) {
      for (const agentPolicy of agentPoliciesData.items) {
        agentPoliciesById[agentPolicy.id] = agentPolicy;
      }
    }

    const updatedPackageData: PackagePolicyAndAgentPolicy[] = packagePoliciesData.items.map(
      (packagePolicy) => {
        return {
          packagePolicy,
          agentPolicy: agentPoliciesById[packagePolicy.policy_id],
        };
      }
    );

    setEnrichedData({
      ...packagePoliciesData,
      items: updatedPackageData,
    });
  }, [isLoadingAgentPolicies, isLoadingPackagePolicies, packagePoliciesData, agentPoliciesData]);

  return {
    data: enrichedData,
    error,
    isLoading: isLoadingPackagePolicies || isLoadingAgentPolicies,
    resendRequest,
  };
};
