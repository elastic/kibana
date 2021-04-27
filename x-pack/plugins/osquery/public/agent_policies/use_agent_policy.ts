/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';
import { agentPolicyRouteService } from '../../../fleet/common';

interface UseAgentPolicy {
  policyId: string;
  skip?: boolean;
}

export const useAgentPolicy = ({ policyId, skip }: UseAgentPolicy) => {
  const { http } = useKibana().services;

  return useQuery(
    ['agentPolicy', { policyId }],
    () => http.get(agentPolicyRouteService.getInfoPath(policyId)),
    {
      enabled: !skip,
      keepPreviousData: true,
      select: (response) => response.item,
    }
  );
};
