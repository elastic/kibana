/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function deserializeCluster(name: string, esClusterObject: any): any {
  if (!name || !esClusterObject || typeof esClusterObject !== 'object') {
    throw new Error('Unable to deserialize cluster');
  }

  const {
    seeds,
    connected: isConnected,
    num_nodes_connected: connectedNodesCount,
    max_connections_per_cluster: maxConnectionsPerCluster,
    initial_connect_timeout: initialConnectTimeout,
    skip_unavailable: skipUnavailable,
    transport,
  } = esClusterObject;

  let deserializedClusterObject: any = {
    name,
    seeds,
    isConnected,
    connectedNodesCount,
    maxConnectionsPerCluster,
    initialConnectTimeout,
    skipUnavailable,
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

  const { name, seeds, skipUnavailable } = deserializedClusterObject;

  return {
    persistent: {
      cluster: {
        remote: {
          [name]: {
            seeds: seeds ? seeds : null,
            skip_unavailable: skipUnavailable !== undefined ? skipUnavailable : null,
          },
        },
      },
    },
  };
}
