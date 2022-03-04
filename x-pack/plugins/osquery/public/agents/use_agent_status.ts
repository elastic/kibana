/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from 'react-query';

import { GetAgentStatusResponse } from '../../../fleet/common';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useKibana } from '../common/lib/kibana';

interface UseAgentStatus {
  policyId?: string;
  skip?: boolean;
}

export const useAgentStatus = ({ policyId, skip }: UseAgentStatus) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<GetAgentStatusResponse, unknown, GetAgentStatusResponse['results']>(
    ['agentStatus', policyId],
    () =>
      http.get(
        `/internal/osquery/fleet_wrapper/agent_status`,
        policyId
          ? {
              query: {
                policyId,
              },
            }
          : {}
      ),
    {
      enabled: !skip,
      select: (response) => response.results,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.agent_status.fetchError', {
            defaultMessage: 'Error while fetching agent status',
          }),
        }),
    }
  );
};
