/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseAgentPolicy {
  policyId?: string;
  silent?: boolean;
  skip?: boolean;
}

export const useAgentPolicy = ({ policyId, skip, silent }: UseAgentPolicy) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useQuery<any, Error>(
    ['agentPolicy', { policyId }],
    () => http.get(`/internal/osquery/fleet_wrapper/agent_policies/${policyId}`),
    {
      enabled: !!(policyId && !skip),
      keepPreviousData: true,
      select: (response) => response.item,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        !silent &&
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.agent_policy_details.fetchError', {
            defaultMessage: 'Error while fetching agent policy details',
          }),
        }),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};
