/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useQuery } from 'react-query';

import { AGENTS_PREFIX, Agent } from '../../../fleet/common';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useKibana } from '../common/lib/kibana';

interface UseAgentPolicyAgentIdsProps {
  agentPolicyId: string | undefined;
  silent?: boolean;
  skip?: boolean;
}

export const useAgentPolicyAgentIds = ({
  agentPolicyId,
  silent,
  skip,
}: UseAgentPolicyAgentIdsProps) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<{ agents: Agent[] }, unknown, string[]>(
    ['agentPolicyAgentIds', agentPolicyId],
    () => {
      const kuery = `${AGENTS_PREFIX}.policy_id:${agentPolicyId}`;

      return http.get(`/internal/osquery/fleet_wrapper/agents`, {
        query: {
          kuery,
          perPage: 10000,
        },
      });
    },
    {
      select: (data) => map(data?.agents, 'id') || ([] as string[]),
      enabled: !skip || !agentPolicyId,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        !silent &&
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.agents.fetchError', {
            defaultMessage: 'Error while fetching agents',
          }),
        }),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};
