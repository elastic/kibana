/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AgentPolicy } from '../types';

import { useGetFleetProxies, useGetFleetServerHosts } from './use_request';

/**
 * Return Fleet server hosts urls and proxy for a given agent policy
 */
export function useFleetServerHostsForPolicy(agentPolicy?: AgentPolicy | null) {
  const fleetServerHostsRequest = useGetFleetServerHosts();
  const fleetProxiesRequest = useGetFleetProxies();

  const allFleetServerHosts = useMemo(
    () => fleetServerHostsRequest.data?.items ?? [],
    [fleetServerHostsRequest]
  );

  const allFleetProxies = useMemo(
    () => fleetProxiesRequest.data?.items ?? [],
    [fleetProxiesRequest]
  );

  const [fleetServerHosts, fleetProxy] = useMemo(() => {
    const fleetServerHost = allFleetServerHosts.find((item) =>
      agentPolicy?.fleet_server_host_id
        ? item.id === agentPolicy?.fleet_server_host_id
        : item.is_default
    );

    const fleetServerHostProxy = fleetServerHost?.proxy_id
      ? allFleetProxies.find((proxy) => proxy.id === fleetServerHost.proxy_id)
      : undefined;

    return [fleetServerHost?.host_urls ?? [], fleetServerHostProxy];
  }, [agentPolicy, allFleetProxies, allFleetServerHosts]);

  const isLoadingInitialRequest =
    (fleetServerHostsRequest.isLoading && fleetServerHostsRequest.isInitialRequest) ||
    (fleetProxiesRequest.isLoading && fleetProxiesRequest.isInitialRequest);

  return useMemo(
    () => ({ isLoadingInitialRequest, fleetServerHosts, fleetProxy, allFleetServerHosts }),
    [fleetServerHosts, fleetProxy, allFleetServerHosts, isLoadingInitialRequest]
  );
}
