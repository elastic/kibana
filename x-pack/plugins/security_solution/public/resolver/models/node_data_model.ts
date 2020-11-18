/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SafeResolverEvent } from '../../../common/endpoint/types';
import { IDToNodeInfo } from '../types';

const copyMap = (nodeData: IDToNodeInfo | undefined) => {
  const newMap: IDToNodeInfo = new Map();
  if (!nodeData) {
    return newMap;
  }

  for (const [id, nodeInfo] of nodeData.entries()) {
    newMap.set(id, { events: [...nodeInfo.events], status: nodeInfo.status });
  }
  return newMap;
};

export function setRequestedNodes(
  storedNodeInfo: IDToNodeInfo | undefined,
  requestedNodes: Set<string>
) {
  const copiedMap = copyMap(storedNodeInfo);
  for (const id of requestedNodes) {
    copiedMap.set(id, { events: [], status: 'requested' });
  }
  return copiedMap;
}

export function setErrorNodes(storedNodeInfo: IDToNodeInfo | undefined, errorNodes: Set<string>) {
  const copiedMap = copyMap(storedNodeInfo);
  for (const id of errorNodes) {
    copiedMap.set(id, { events: [], status: 'error' });
  }
  return copiedMap;
}

export function updateWithReceivedNodes({
  storedNodeInfo,
  receivedNodes,
  requestedNodes,
  reachedLimit,
}: {
  storedNodeInfo: IDToNodeInfo | undefined;
  receivedNodes: Map<string, SafeResolverEvent[]>;
  requestedNodes: Set<string>;
  reachedLimit: boolean;
}) {
  const copiedMap = copyMap(storedNodeInfo);

  for (const id of requestedNodes.values()) {
    // If the server returned the same number of events that we requested it's possible
    // that we won't have node data for each of the IDs. So we'll want to remove the ID's
    // from the map that we don't have node data for
    if (!receivedNodes.has(id)) {
      if (reachedLimit) {
        copiedMap.delete(id);
      } else {
        // if we didn't reach the limit but we didn't receive any node data for a particular ID
        // then that means Elasticsearch does not have any node data for that ID.
        copiedMap.set(id, { events: [], status: 'received' });
      }
    }
  }

  // for the nodes we got results for, create a new array with the contents of those events
  for (const [id, events] of receivedNodes.entries()) {
    copiedMap.set(id, { events: [...events], status: 'received' });
  }

  return copiedMap;
}

export function idsNotInBase(baseNodes: IDToNodeInfo | undefined, nodesToCheck: Set<string>) {
  const result = new Set<string>();

  for (const id of nodesToCheck.values()) {
    if (!baseNodes || !baseNodes.has(id)) {
      return result.add(id);
    }
  }

  return result;
}
