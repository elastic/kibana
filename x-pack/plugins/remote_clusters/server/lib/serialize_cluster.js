/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function serializeCluster(name, esClusterObject) {
  let serializedClusterObject;
  const {
    seeds,
    connected: isConnected,
    num_nodes_connected: connectedNodesCount,
    max_connections_per_cluster: maxConnectionsPerCluster,
    initial_connect_timeout: initialConnectTimeout,
    skip_unavailable: skipUnavailable,
    transport,
  } = esClusterObject;

  serializedClusterObject = {
    name,
    seeds,
    isConnected,
    connectedNodesCount,
    maxConnectionsPerCluster,
    initialConnectTimeout,
    skipUnavailable,
  };

  if(transport) {
    const {
      ping_schedule: transportPingSchedule,
      compress: transportCompress,
    } = transport;

    serializedClusterObject = {
      ...serializedClusterObject,
      transportPingSchedule,
      transportCompress,
    };
  }

  return serializedClusterObject;
}
