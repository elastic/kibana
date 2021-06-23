/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import { agentPolicyRouteService } from '../../../fleet/common';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseAgentPolicy {
  policyId: string;
  skip?: boolean;
}

export const useAgentPolicy = ({ policyId, skip }: UseAgentPolicy) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    ['agentPolicy', { policyId }],
    () => http.get(agentPolicyRouteService.getInfoPath(policyId)),
    {
      enabled: !skip,
      keepPreviousData: true,
      select: (response) => response.item,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.agent_policy_details.fetchError', {
            defaultMessage: 'Error while fetching agent policy details',
          }),
        }),
    }
  );
};
