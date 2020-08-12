/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useRequest } from '../../../../hooks';
import { GetAgentStatusResponse } from '../../../../types';
import { agentRouteService } from '../../../../services';
import { UseRequestConfig } from '../../../../hooks/use_request/use_request';

type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;

export function useGetAgentStatus(policyId?: string, options?: RequestOptions) {
  const agentStatusRequest = useRequest<GetAgentStatusResponse>({
    path: agentRouteService.getStatusPath(),
    query: {
      policyId,
    },
    method: 'get',
    ...options,
  });

  return {
    isLoading: agentStatusRequest.isLoading,
    data: agentStatusRequest.data,
    error: agentStatusRequest.error,
    refreshAgentStatus: () => agentStatusRequest.sendRequest,
  };
}

export const AgentStatusRefreshContext = React.createContext({ refresh: () => {} });

export function useAgentStatusRefresh() {
  return React.useContext(AgentStatusRefreshContext).refresh;
}
