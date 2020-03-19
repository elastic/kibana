/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PROXY_MODE } from '../constants';

export interface ClusterEs {
  seeds?: string[];
  mode?: 'proxy' | 'sniff';
  connected?: boolean;
  num_nodes_connected?: number;
  max_connections_per_cluster?: number;
  initial_connect_timeout?: string;
  skip_unavailable?: boolean;
  transport?: {
    ping_schedule?: string;
    compress?: boolean;
  };
  address?: string;
  max_socket_connections?: number;
  num_sockets_connected?: number;
}

export interface Cluster {
  name: string;
  seeds?: string[];
  skipUnavailable?: boolean;
  nodeConnections?: number;
  proxyAddress?: string;
  proxySocketConnections?: number;
  serverName?: string;
  mode?: 'proxy' | 'sniff';
  isConnected?: boolean;
  transportPingSchedule?: string;
  transportCompress?: boolean;
  connectedNodesCount?: number;
  maxConnectionsPerCluster?: number;
  initialConnectTimeout?: string;
  connectedSocketsCount?: number;
  hasDeprecatedProxySetting?: boolean;
}
export interface ClusterPayload {
  persistent: {
    cluster: {
      remote: {
        [key: string]: {
          skip_unavailable?: boolean | null;
          mode?: 'sniff' | 'proxy' | null;
          proxy_address?: string | null;
          proxy_socket_connections?: number | null;
          server_name?: string | null;
          seeds?: string[] | null;
          node_connections?: number | null;
        };
      };
    };
  };
}

export function deserializeCluster(
  name: string,
  esClusterObject: ClusterEs,
  deprecatedProxyAddress?: string | undefined
): Cluster {
  if (!name || !esClusterObject || typeof esClusterObject !== 'object') {
    throw new Error('Unable to deserialize cluster');
  }

  const {
    seeds,
    mode,
    connected: isConnected,
    num_nodes_connected: connectedNodesCount,
    max_connections_per_cluster: maxConnectionsPerCluster,
    initial_connect_timeout: initialConnectTimeout,
    skip_unavailable: skipUnavailable,
    transport,
    address: proxyAddress,
    max_socket_connections: proxySocketConnections,
    num_sockets_connected: connectedSocketsCount,
  } = esClusterObject;

  let deserializedClusterObject: Cluster = {
    name,
    mode,
    isConnected,
    connectedNodesCount,
    maxConnectionsPerCluster,
    initialConnectTimeout,
    skipUnavailable,
    seeds,
    proxyAddress,
    proxySocketConnections,
    connectedSocketsCount,
  };

  if (transport) {
    const { ping_schedule: transportPingSchedule, compress: transportCompress } = transport;

    deserializedClusterObject = {
      ...deserializedClusterObject,
      transportPingSchedule,
      transportCompress,
    };
  }

  // If a user has a remote cluster with the deprecated proxy setting,
  // we transform the data to support the new implementation and also flag the deprecation
  if (deprecatedProxyAddress) {
    deserializedClusterObject = {
      ...deserializedClusterObject,
      proxyAddress: deprecatedProxyAddress,
      seeds: undefined,
      hasDeprecatedProxySetting: true,
      mode: PROXY_MODE,
    };
  }

  // It's unnecessary to send undefined values back to the client, so we can remove them.
  Object.keys(deserializedClusterObject).forEach(key => {
    if (deserializedClusterObject[key as keyof Cluster] === undefined) {
      delete deserializedClusterObject[key as keyof Cluster];
    }
  });

  return deserializedClusterObject;
}

export function serializeCluster(deserializedClusterObject: Cluster): ClusterPayload {
  if (!deserializedClusterObject || typeof deserializedClusterObject !== 'object') {
    throw new Error('Unable to serialize cluster');
  }

  const {
    name,
    seeds,
    skipUnavailable,
    mode,
    nodeConnections,
    proxyAddress,
    proxySocketConnections,
    serverName,
  } = deserializedClusterObject;

  return {
    // Background on why we only save as persistent settings detailed here: https://github.com/elastic/kibana/pull/26067#issuecomment-441848124
    persistent: {
      cluster: {
        remote: {
          [name]: {
            skip_unavailable: skipUnavailable !== undefined ? skipUnavailable : null,
            mode: mode ?? null,
            proxy_address: proxyAddress ?? null,
            proxy_socket_connections: proxySocketConnections ?? null,
            server_name: serverName ?? null,
            seeds: seeds ?? null,
            node_connections: nodeConnections ?? null,
          },
        },
      },
    },
  };
}
