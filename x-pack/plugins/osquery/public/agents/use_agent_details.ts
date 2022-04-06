/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from 'react-query';

import { GetOneAgentResponse } from '../../../fleet/common';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useKibana } from '../common/lib/kibana';

interface UseAgentDetails {
  agentId?: string;
  silent?: boolean;
  skip?: boolean;
}

export const useAgentDetails = ({ agentId, silent, skip }: UseAgentDetails) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<GetOneAgentResponse, unknown, GetOneAgentResponse['item']>(
    ['agentDetails', agentId],
    () => http.get(`/internal/osquery/fleet_wrapper/agents/${agentId}`),
    {
      enabled: !skip,
      retry: false,
      select: (response: GetOneAgentResponse) => response?.item,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        !silent &&
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.agentDetails.fetchError', {
            defaultMessage: 'Error while fetching agent details',
          }),
        }),
    }
  );
};
