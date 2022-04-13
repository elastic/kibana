/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys } from 'lodash';
import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import { GetAgentPoliciesResponseItem } from '../../../fleet/common';
import { useErrorToast } from '../common/hooks/use_error_toast';

export const useAgentPolicies = () => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<
    GetAgentPoliciesResponseItem[],
    unknown,
    {
      agentPoliciesById: Record<string, GetAgentPoliciesResponseItem>;
      agentPolicies: GetAgentPoliciesResponseItem[];
    }
  >(['agentPolicies'], () => http.get('/internal/osquery/fleet_wrapper/agent_policies'), {
    initialData: [],
    keepPreviousData: true,
    select: (response) => ({
      agentPoliciesById: mapKeys(response, 'id'),
      agentPolicies: response,
    }),
    onSuccess: () => setErrorToast(),
    onError: (error) =>
      setErrorToast(error as Error, {
        title: i18n.translate('xpack.osquery.agent_policies.fetchError', {
          defaultMessage: 'Error while fetching agent policies',
        }),
      }),
  });
};
