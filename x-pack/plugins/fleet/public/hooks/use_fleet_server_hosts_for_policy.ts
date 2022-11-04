/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AgentPolicy } from '../types';

import { useGetFleetServerHosts } from './use_request';

/**
 * Return Fleet server hosts urls for a given agent policy
 */
export function useFleetServerHostsForPolicy(agentPolicy?: AgentPolicy | null) {
  const fleetServerHostsRequest = useGetFleetServerHosts();
  const fleetServerHosts = useMemo(() => {
    return (
      fleetServerHostsRequest.data?.items.filter((item) =>
        agentPolicy?.fleet_server_host_id
          ? item.id === agentPolicy?.fleet_server_host_id
          : item.is_default
      )?.[0]?.host_urls ?? []
    );
  }, [agentPolicy, fleetServerHostsRequest]);

  const isLoadingInitialRequest =
    fleetServerHostsRequest.isLoading && fleetServerHostsRequest.isInitialRequest;

  const allFleetServerHosts = useMemo(
    () => fleetServerHostsRequest.data?.items ?? [],
    [fleetServerHostsRequest]
  );

  return useMemo(
    () => ({ isLoadingInitialRequest, fleetServerHosts, allFleetServerHosts }),
    [fleetServerHosts, allFleetServerHosts, isLoadingInitialRequest]
  );
}
