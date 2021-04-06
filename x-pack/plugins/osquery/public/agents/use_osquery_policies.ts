/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useKibana } from '../common/lib/kibana';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../fleet/common';

export const useOsqueryPolicies = () => {
  const { http } = useKibana().services;

  const { isLoading: osqueryPoliciesLoading, data: osqueryPolicies } = useQuery(
    ['osqueryPolicies'],
    async () => {
      return await http.get('/api/fleet/package_policies', {
        query: {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:osquery_manager`,
        },
      });
    },
    { select: (data) => data.items.map((p: { policy_id: string }) => p.policy_id) }
  );

  return { osqueryPoliciesLoading, osqueryPolicies };
};
