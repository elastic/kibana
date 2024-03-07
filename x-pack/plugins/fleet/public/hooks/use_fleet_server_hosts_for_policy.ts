/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AgentPolicy } from '../types';

import { useGetDownloadSources, useGetFleetProxies, useGetFleetServerHosts } from './use_request';

/**
 * Return Fleet server hosts urls and proxy for a given agent policy
 */
export function useFleetServerHostsForPolicy(agentPolicy?: AgentPolicy | null) {
  const fleetServerHostsRequest = useGetFleetServerHosts();
  const fleetProxiesRequest = useGetFleetProxies();
  const downloadSourceRequest = useGetDownloadSources();
  const allFleetServerHosts = useMemo(
    () => fleetServerHostsRequest.data?.items ?? [],
    [fleetServerHostsRequest]
  );

  const allFleetProxies = useMemo(
    () => fleetProxiesRequest.data?.items ?? [],
    [fleetProxiesRequest]
  );

  const allDownloadSource = useMemo(
    () => downloadSourceRequest.data?.items ?? [],
    [downloadSourceRequest]
  );

  const [fleetServerHosts, fleetProxy, downloadSource] = useMemo(() => {
    const fleetServerHost = allFleetServerHosts.find((item) =>
      agentPolicy?.fleet_server_host_id
        ? item.id === agentPolicy?.fleet_server_host_id
        : item.is_default
    );

    const fleetServerHostProxy = fleetServerHost?.proxy_id
      ? allFleetProxies.find((proxy) => proxy.id === fleetServerHost.proxy_id)
      : undefined;

    const currentDownloadSource = agentPolicy?.download_source_id
      ? allDownloadSource.find((d) => d.id === agentPolicy?.download_source_id)
      : allDownloadSource.find((d) => d.is_default);

    return [fleetServerHost?.host_urls ?? [], fleetServerHostProxy, currentDownloadSource];
  }, [agentPolicy, allFleetProxies, allFleetServerHosts, allDownloadSource]);

  const isLoadingInitialRequest =
    (fleetServerHostsRequest.isLoading && fleetServerHostsRequest.isInitialRequest) ||
    (fleetProxiesRequest.isLoading && fleetProxiesRequest.isInitialRequest) ||
    (downloadSourceRequest.isLoading && downloadSourceRequest.isInitialRequest);

  return useMemo(
    () => ({
      isLoadingInitialRequest,
      fleetServerHosts,
      fleetProxy,
      downloadSource,
      allFleetServerHosts,
    }),
    [fleetServerHosts, fleetProxy, downloadSource, allFleetServerHosts, isLoadingInitialRequest]
  );
}
