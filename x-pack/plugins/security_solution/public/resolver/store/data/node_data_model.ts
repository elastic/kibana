/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IDToNodeEvents, NodeDataRequestStatus } from '../../types';

export function mergeMaps(first: IDToNodeEvents, second: IDToNodeEvents) {
  const mergedMaps: IDToNodeEvents = new Map();

  const addEntriesFromMap = (nodeData: IDToNodeEvents) => {
    for (const [id, nodeInfo] of nodeData.entries()) {
      const mergedMapEvents = mergedMaps.get(id);
      if (!mergedMapEvents) {
        mergedMaps.set(id, { events: [...nodeInfo.events], status: nodeInfo.status });
      } else {
        // TODO: document that we're using the second map to overwrite the initial ones if they existed
        mergedMapEvents.events = [...nodeInfo.events];
        mergedMapEvents.status = nodeInfo.status;
      }
    }
  };

  addEntriesFromMap(first);
  addEntriesFromMap(second);

  return mergedMaps;
}

const copyMap = (nodeData: IDToNodeEvents) => {
  const newMap: IDToNodeEvents = new Map();

  for (const [id, nodeInfo] of nodeData.entries()) {
    newMap.set(id, { events: [...nodeInfo.events], status: nodeInfo.status });
  }
  return newMap;
};

export function setRequestedNodes(requestedNodes: Set<string>, storedNodeInfo: IDToNodeEvents) {
  const copiedMap = copyMap(storedNodeInfo);
  for (const id of requestedNodes) {
    copiedMap.set(id, { events: [], status: NodeDataRequestStatus.Requested });
  }
  return copiedMap;
}

export function updateWithReceivedNodes(
  receivedNodes: IDToNodeEvents,
  storedNodeInfo: IDToNodeEvents
) {
  const copiedMap = copyMap(storedNodeInfo);
  for (const [id, nodeInfo] of receivedNodes.entries()) {
    copiedMap.set(id, { events: [...nodeInfo.events], status: nodeInfo.status });
  }
  return copiedMap;
}

export function hasIDsInNodeInfo(
  nodesToCheck: Set<string>,
  storedNodes: IDToNodeEvents | undefined
) {
  if (!storedNodes) {
    return false;
  }

  for (const id of nodesToCheck.values()) {
    if (!storedNodes.has(id)) {
      return false;
    }
  }

  return true;
}
