/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys } from 'lodash';
import { useQueries, UseQueryResult } from 'react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import { agentPolicyRouteService, GetOneAgentPolicyResponse } from '../../../fleet/common';

export const useAgentPolicies = (policyIds: string[] = []) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const agentResponse = useQueries(
    policyIds.map((policyId) => ({
      queryKey: ['agentPolicy', policyId],
      queryFn: () => http.get(agentPolicyRouteService.getInfoPath(policyId)),
      enabled: policyIds.length > 0,
      onError: (error) =>
        toasts.addError(error as Error, {
          title: i18n.translate('xpack.osquery.action_policy_details.fetchError', {
            defaultMessage: 'Error while fetching policy details',
          }),
        }),
    }))
  ) as Array<UseQueryResult<GetOneAgentPolicyResponse>>;

  const agentPoliciesLoading = agentResponse.some((p) => p.isLoading);
  const agentPolicies = agentResponse.map((p) => p.data?.item);
  const agentPolicyById = mapKeys(agentPolicies, 'id');

  return { agentPoliciesLoading, agentPolicies, agentPolicyById };
};
