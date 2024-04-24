/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AgentPolicy } from '../types';
import { SO_SEARCH_LIMIT } from '../constants';

import { useAuthz } from './use_authz';

import { useGetAgentPolicies, useGetEnrollmentSettings } from './use_request';

interface AgentEnrollmentFlyoutData {
  agentPolicies: AgentPolicy[];
  refreshAgentPolicies: () => void;
  isLoadingInitialAgentPolicies: boolean;
  isLoadingAgentPolicies: boolean;
}

export function useAgentEnrollmentFlyoutData(): AgentEnrollmentFlyoutData {
  const authz = useAuthz();
  const {
    data: agentPoliciesData,
    isInitialRequest: isInitialAgentPolicyRequest,
    isLoading: isLoadingAgentPolicies,
    resendRequest: refreshAgentPolicies,
  } = useGetAgentPolicies({
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    full: authz.fleet.readAgentPolicies,
  });

  const {
    data: fleetServerPolicyStatus,
    isInitialRequest: isInitialFleetServerPolicyStatusRequest,
    isLoading: isLoadingFleetServerPolicyStatus,
    resendRequest: refreshFleetServerPolicyStatus,
  } = useGetEnrollmentSettings();

  const agentPolicies = useMemo(() => {
    if (!isLoadingAgentPolicies || !isLoadingFleetServerPolicyStatus) {
      const fleetServerPolicyIds = fleetServerPolicyStatus?.fleet_server?.policies.map(
        (policy) => policy.id
      );
      return (agentPoliciesData?.items ?? []).filter(
        (policy) => !fleetServerPolicyIds?.includes(policy.id)
      );
    }
    return [];
  }, [
    isLoadingAgentPolicies,
    isLoadingFleetServerPolicyStatus,
    fleetServerPolicyStatus?.fleet_server?.policies,
    agentPoliciesData?.items,
  ]);

  const refreshData = () => {
    refreshAgentPolicies();
    refreshFleetServerPolicyStatus();
  };

  return {
    agentPolicies,
    refreshAgentPolicies: refreshData,
    isLoadingInitialAgentPolicies:
      isInitialAgentPolicyRequest || isInitialFleetServerPolicyStatusRequest,
    isLoadingAgentPolicies: isLoadingAgentPolicies || isLoadingFleetServerPolicyStatus,
  };
}
