/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from 'react-query';

import { GetAgentsResponse, agentRouteService } from '../../../fleet/common';
import { useKibana } from '../common/lib/kibana';

interface UseAllAgents {
  osqueryPolicies: string[];
  osqueryPoliciesLoading: boolean;
}

interface RequestOptions {
  perPage?: number;
  page?: number;
}

// TODO: break out the paginated vs all cases into separate hooks
export const useAllAgents = (
  { osqueryPolicies, osqueryPoliciesLoading }: UseAllAgents,
  searchValue = '',
  opts: RequestOptions = { perPage: 9000 }
) => {
  const { perPage } = opts;
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { isLoading: agentsLoading, data: agentData } = useQuery<GetAgentsResponse>(
    ['agents', osqueryPolicies, searchValue, perPage],
    () => {
      const kueryFragments: string[] = [];
      if (osqueryPolicies.length) {
        kueryFragments.push(`${osqueryPolicies.map((p) => `policy_id:${p}`).join(' or ')}`);
      }

      if (searchValue) {
        kueryFragments.push(
          `local_metadata.host.hostname:*${searchValue}* or local_metadata.elastic.agent.id:*${searchValue}*`
        );
      }

      return http.get(agentRouteService.getListPath(), {
        query: {
          kuery: kueryFragments.map((frag) => `(${frag})`).join(' and '),
          perPage,
          showInactive: true,
        },
      });
    },
    {
      enabled: !osqueryPoliciesLoading,
      onError: (error) =>
        toasts.addError(error as Error, {
          title: i18n.translate('xpack.osquery.agents.fetchError', {
            defaultMessage: 'Error while fetching agents',
          }),
        }),
    }
  );

  return { agentsLoading, agents: agentData?.list };
};
