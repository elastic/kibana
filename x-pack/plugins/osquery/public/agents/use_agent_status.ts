/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from 'react-query';

import { GetAgentStatusResponse, agentRouteService } from '../../../fleet/common';
import { useKibana } from '../common/lib/kibana';

interface UseAgentStatus {
  policyId?: string;
  skip?: boolean;
}

export const useAgentStatus = ({ policyId, skip }: UseAgentStatus) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery<GetAgentStatusResponse, unknown, GetAgentStatusResponse['results']>(
    ['agentStatus', policyId],
    () =>
      http.get(
        agentRouteService.getStatusPath(),
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
      onError: (error) =>
        toasts.addError(error as Error, {
          title: i18n.translate('xpack.osquery.agent_status.fetchError', {
            defaultMessage: 'Error while fetching agent status',
          }),
        }),
    }
  );
};
