/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function deserializeCluster(name, esClusterObject) {
  if(!name || !esClusterObject || typeof esClusterObject !== 'object') {
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
    isTransient,
    isPersistent,
    settings: {
      transient: transientSettings,
      persistent: persistentSettings,
    } = {
      transient: null,
      persistent: null,
      configuration: null,
    },
  } = esClusterObject;

  const deserializedClusterObject = {
    name,
    seeds,
    isConnected,
    connectedNodesCount,
    maxConnectionsPerCluster,
    initialConnectTimeout,
    skipUnavailable,
    isTransient,
    isPersistent,
    ...deserializeTransport(transport),
    transientSettings: deserializeSettings(transientSettings),
    persistentSettings: deserializeSettings(persistentSettings),
  };

  return deserializedClusterObject;
}

function deserializeTransport(transport) {
  if(transport) {
    const {
      ping_schedule: transportPingSchedule,
      compress: transportCompress,
    } = transport;
    return {
      transportPingSchedule,
      transportCompress,
    };
  }

  return undefined;
}

function deserializeSettings(settings) {
  if(settings) {
    const {
      seeds,
      skip_unavailable: skipUnavailable,
      transport,
    } = settings;

    let skipUnavailableValue;

    if(typeof skipUnavailable === 'string') {
      skipUnavailableValue = (skipUnavailable === "true");
    } else {
      skipUnavailableValue = skipUnavailable;
    }

    return {
      seeds,
      skipUnavailable: skipUnavailableValue,
      ...deserializeTransport(transport)
    };
  }

  return undefined;
}

export function serializeCluster(name, deserializedClusterObject) {
  if(!name || !deserializedClusterObject || typeof deserializedClusterObject !== 'object') {
    throw new Error('Unable to serialize cluster');
  }

  let transientSeeds;
  let transientSkipUnavailable;
  let persistentSeeds;
  let persistentSkipUnavailable;

  const esClusterObject = {};

  const {
    transientSettings,
    persistentSettings,
  } = deserializedClusterObject;

  if(transientSettings) {
    transientSeeds = transientSettings.seeds;
    transientSkipUnavailable = transientSettings.skipUnavailable;
    esClusterObject.transient = {
      cluster: {
        remote: {
          [name]: {
            seeds: transientSeeds && transientSeeds.length ? transientSeeds : null,
            skip_unavailable: transientSkipUnavailable,
          }
        }
      }
    };
  } else {
    esClusterObject.transient = {
      cluster: {
        remote: {
          [name]: {
            seeds: null,
            skip_unavailable: null,
          }
        }
      }
    };
  }

  if(persistentSettings) {
    persistentSeeds = persistentSettings.seeds;
    persistentSkipUnavailable = persistentSettings.skipUnavailable;
    esClusterObject.persistent = {
      cluster: {
        remote: {
          [name]: {
            seeds: persistentSeeds && persistentSeeds.length ? persistentSeeds : null,
            skip_unavailable: persistentSkipUnavailable,
          }
        }
      }
    };
  } else {
    esClusterObject.persistent = {
      cluster: {
        remote: {
          [name]: {
            seeds: null,
            skip_unavailable: null,
          }
        }
      }
    };
  }

  return esClusterObject;
}
