/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useRequest } from '../../../../hooks';

export function useGetAgentStatus(configId: string) {
  const agentStatusRequest = useRequest({
    path: `/api/ingest_manager/fleet/config/${configId}/agent-status`,
    method: 'get',
  });

  return {
    isLoading: agentStatusRequest.isLoading,
    result: agentStatusRequest.data ? agentStatusRequest.data.result : {},
    error: agentStatusRequest.error,
    refreshAgentStatus: () => agentStatusRequest.sendRequest,
  };
}

export const AgentStatusRefreshContext = React.createContext({ refresh: () => {} });

export function useAgentStatusRefresh() {
  return React.useContext(AgentStatusRefreshContext).refresh;
}
