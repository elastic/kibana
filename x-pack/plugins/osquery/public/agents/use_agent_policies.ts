/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueries, UseQueryResult } from 'react-query';
import { useKibana } from '../common/lib/kibana';
import { AgentPolicy, agentPolicyRouteService, GetOneAgentPolicyResponse } from '../../../fleet/common';

export const useAgentPolicies = (policyIds: string[] = []) => {
  const { http } = useKibana().services;

  const agentResponse = useQueries(
    policyIds.map((policyId) => ({
      queryKey: ['agentPolicy', policyId],
      queryFn: () => http.get(agentPolicyRouteService.getInfoPath(policyId)),
      options: {enabled: policyIds.length > 0}
    })),
  ) as Array<UseQueryResult<GetOneAgentPolicyResponse>>;

  const agentPoliciesLoading = agentResponse.some(p => p.isLoading) 
  const agentPolicies = agentResponse.map(p => p.data?.item)
  const agentPolicyById = agentPolicies.reduce((acc, p) => {
    if (!p) {
      return acc
    }
    acc[p.id] = p
    return acc
  }, {} as {[key: string]: AgentPolicy})

  return { agentPoliciesLoading, agentPolicies, agentPolicyById };
};
