/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQuery } from 'react-query';
import { useKibana } from '../common/lib/kibana';

export const useOsqueryPolicies = () => {
  const [osqueryPolicies, setPolicies] = useState<string[]>([]);
  const { http } = useKibana().services;

  const { isLoading: osqueryPoliciesLoading } = useQuery(['osqueryPolicies'], async () => {
    const policyResponse = await http.get('/api/fleet/package_policies', {
      query: {
        kuery: 'ingest-package-policies.package.name:osquery_elastic_managed',
      },
    });
    setPolicies(policyResponse.items.map((p: { policy_id: string }) => p.policy_id));
  });

  return { osqueryPoliciesLoading, osqueryPolicies };
};
