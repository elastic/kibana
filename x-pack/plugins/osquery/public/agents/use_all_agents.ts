/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from 'react-query';

import { GetAgentsResponse } from '@kbn/fleet-plugin/common';
import { useErrorToast } from '../common/hooks/use_error_toast';
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
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<GetAgentsResponse>(
    ['agents', osqueryPolicies, searchValue, perPage],
    () => {
      let kuery = `(${osqueryPolicies.map((p) => `policy_id:${p}`).join(' or ')})`;

      if (searchValue) {
        kuery += ` and (local_metadata.host.hostname:*${searchValue}* or local_metadata.elastic.agent.id:*${searchValue}*)`;
      }

      return http.get(`/internal/osquery/fleet_wrapper/agents`, {
        query: {
          kuery,
          perPage,
        },
      });
    },
    {
      // @ts-expect-error update types
      select: (data) => data?.agents || [],
      enabled: !osqueryPoliciesLoading && osqueryPolicies.length > 0,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        // @ts-expect-error update types
        setErrorToast(error?.body, {
          title: i18n.translate('xpack.osquery.agents.fetchError', {
            defaultMessage: 'Error while fetching agents',
          }),
          // @ts-expect-error update types
          toastMessage: error?.body?.error,
        }),
    }
  );
};
