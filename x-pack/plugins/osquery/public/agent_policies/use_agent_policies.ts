/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';
import {
  agentPolicyRouteService,
  GetAgentPoliciesResponse,
  GetAgentPoliciesResponseItem,
} from '../../../fleet/common';

export const useAgentPolicies = () => {
  const { http } = useKibana().services;

  return useQuery<GetAgentPoliciesResponse, unknown, GetAgentPoliciesResponseItem[]>(
    ['agentPolicies'],
    () =>
      http.get(agentPolicyRouteService.getListPath(), {
        query: {
          perPage: 100,
        },
      }),
    {
      initialData: { items: [], total: 0, page: 1, perPage: 100 },
      placeholderData: [],
      keepPreviousData: true,
      select: (response) => response.items,
    }
  );
};
