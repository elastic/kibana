/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';

interface UseAllAgents {
  osqueryPolicies: string[];
  osqueryPoliciesLoading: boolean;
}

export const useAllAgents = ({ osqueryPolicies, osqueryPoliciesLoading }: UseAllAgents) => {
  // TODO: properly fetch these in an async manner
  const { http } = useKibana().services;
  const { isLoading: agentsLoading, data: agentData } = useQuery(
    ['agents', osqueryPolicies],
    async () => {
      return await http.get('/api/fleet/agents', {
        query: {
          kuery: osqueryPolicies.map((p) => `policy_id:${p}`).join(' or '),
          perPage: 9000,
        },
      });
    },
    {
      enabled: !osqueryPoliciesLoading,
    }
  );

  return { agentsLoading, agents: agentData?.list };
};
