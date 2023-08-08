/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../hooks/use_kibana';

const POLICIES_URL = '/api/fleet/package_policies';
const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

export interface PolicyResponse {
  items: Policy[];
}

export interface Policy {
  id: string;
  name: string;
}

export function usePolicies() {
  const { http } = useKibana().services;
  const queryKey = ['policies'];

  const fetchPolicies = () =>
    http.get<PolicyResponse>(POLICIES_URL, {
      query: {
        withAgentCount: true,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
      },
    });

  return useQuery(queryKey, fetchPolicies, {
    select: (data: PolicyResponse) => data.items,
  });
}
