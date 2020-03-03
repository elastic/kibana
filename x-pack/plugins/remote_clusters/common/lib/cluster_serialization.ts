/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PROXY_MODE } from '../constants';

export function deserializeCluster(name: string, esClusterObject: any): any {
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
    // TODO: finish
    // node_connections: nodeConnections,
    // node,
    // proxy_socket_connections: proxySocketConnections,
    // server_name: serverName,
  } = esClusterObject;

  let connectionModeSettings;
  if (mode === PROXY_MODE) {
    connectionModeSettings = {
      proxyAddress,
      // proxySocketConnections,
      // serverName,
    };
  } else {
    connectionModeSettings = {
      seeds,
      // nodeConnections,
      // nodeAttribute: node?.attr ?? null,
    };
  }

  let deserializedClusterObject: any = {
    name,
    mode,
    isConnected,
    connectedNodesCount,
    maxConnectionsPerCluster,
    initialConnectTimeout,
    skipUnavailable,
    ...connectionModeSettings,
  };

  if (transport) {
    const { ping_schedule: transportPingSchedule, compress: transportCompress } = transport;

    deserializedClusterObject = {
      ...deserializedClusterObject,
      transportPingSchedule,
      transportCompress,
    };
  }

  // It's unnecessary to send undefined values back to the client, so we can remove them.
  Object.keys(deserializedClusterObject).forEach(key => {
    if (deserializedClusterObject[key] === undefined) {
      delete deserializedClusterObject[key];
    }
  });

  return deserializedClusterObject;
}

export function serializeCluster(deserializedClusterObject: any): any {
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

  let connectionModeSettings;

  if (mode === PROXY_MODE) {
    connectionModeSettings = {
      proxy_address: proxyAddress ?? null,
      proxy_socket_connections: proxySocketConnections ?? null,
      server_name: serverName ?? null,
    };
  } else {
    connectionModeSettings = {
      seeds: seeds ?? null,
      node_connections: nodeConnections ?? null,
    };
  }

  return {
    persistent: {
      cluster: {
        remote: {
          [name]: {
            skip_unavailable: skipUnavailable !== undefined ? skipUnavailable : null,
            mode,
            ...connectionModeSettings,
          },
        },
      },
    },
  };
}
