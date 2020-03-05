/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useRequest } from '../../../../hooks';
import { GetAgentStatusResponse } from '../../../../types';

export function useGetAgentStatus(configId?: string) {
  const agentStatusRequest = useRequest<GetAgentStatusResponse>({
    path: `/api/ingest_manager/fleet/agent-status`,
    query: {
      configId,
    },
    method: 'get',
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
