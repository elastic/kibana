/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AgentPolicy } from '../types';

import { useGetAgentPolicies } from './use_request';

interface AgentEnrollmentFlyoutData {
  agentPolicies: AgentPolicy[];
  refreshAgentPolicies: () => void;
  isLoadingInitialAgentPolicies: boolean;
  isLoadingAgentPolicies: boolean;
}

export function useAgentEnrollmentFlyoutData(): AgentEnrollmentFlyoutData {
  const {
    data: agentPoliciesData,
    isInitialRequest,
    isLoading: isLoadingAgentPolicies,
    resendRequest: refreshAgentPolicies,
  } = useGetAgentPolicies({
    page: 1,
    perPage: 1000,
    full: true,
  });

  const agentPolicies = useMemo(() => {
    if (!isLoadingAgentPolicies) {
      return agentPoliciesData?.items ?? [];
    }
    return [];
  }, [isLoadingAgentPolicies, agentPoliciesData?.items]);

  return {
    agentPolicies,
    refreshAgentPolicies,
    isLoadingInitialAgentPolicies: isInitialRequest && isLoadingAgentPolicies,
    isLoadingAgentPolicies,
  };
}
