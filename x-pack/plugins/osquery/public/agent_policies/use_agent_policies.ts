/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import {
  agentPolicyRouteService,
  GetAgentPoliciesResponse,
  GetAgentPoliciesResponseItem,
} from '../../../fleet/common';

export const useAgentPolicies = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery<GetAgentPoliciesResponse, unknown, GetAgentPoliciesResponseItem[]>(
    ['agentPolicies'],
    () =>
      http.get(agentPolicyRouteService.getListPath(), {
        query: {
          perPage: 100,
        },
      }),
    {
      initialData: { items: [], total: 0, page: 1, perPage: 100 },
      placeholderData: [],
      keepPreviousData: true,
      select: (response) => response.items,
      onError: (error) =>
        toasts.addError(error as Error, {
          title: i18n.translate('xpack.osquery.agent_policies.fetchError', {
            defaultMessage: 'Error while fetching agent policies',
          }),
        }),
    }
  );
};
