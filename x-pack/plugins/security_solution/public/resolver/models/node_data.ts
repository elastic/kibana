/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FetchedNodeData, IDToNodeInfo, NodeData } from '../types';

/**
 * Creates a copy of the node data map and initializes the specified IDs to an empty object with status requested.
 *
 * @param storedNodeInfo the node data from state
 * @param requestedNodes a set of IDs that are being requested
 */
export function setRequestedNodes(
  storedNodeInfo: IDToNodeInfo | undefined,
  requestedNodes: Set<string>
): IDToNodeInfo {
  const originalData = storedNodeInfo ?? [];
  const requestedNodesArray = Array.from(requestedNodes);
  return new Map<string, NodeData>([
    ...originalData,
    ...requestedNodesArray.map((id: string): [string, NodeData] => [
      id,
      { events: [], status: 'requested', terminated: false },
    ]),
  ]);
}

/**
 * Creates a copy of the node data map and sets the specified IDs to an error state.
 *
 * @param storedNodeInfo the node data from state
 * @param errorNodes a set of IDs we requested from the backend that returned a failure
 */
export function setErrorNodes(
  storedNodeInfo: IDToNodeInfo | undefined,
  errorNodes: Set<string>
): IDToNodeInfo {
  const originalData = storedNodeInfo ?? [];
  const errorNodesArray = Array.from(errorNodes);
  return new Map<string, NodeData>([
    ...originalData,
    ...errorNodesArray.map((id: string): [string, NodeData] => [
      id,
      { events: [], status: 'error', terminated: false },
    ]),
  ]);
}

/**
 * Creates a copy of the node data map and updates it with the data returned by the server. If the server did not return
 * data for a particular ID we will determine whether no data exists for that ID or if the server reached the limit we
 * requested by using the reachedLimit flag.
 *
 * @param storedNodeInfo the node data from state
 * @param receivedNodes the events grouped by ID that the server returned
 * @param requestedNodes the IDs that we requested the server find events for
 * @param reachedLimit a flag indicating whether the server returned the same number of events we requested
 */
export function updateWithReceivedNodes({
  storedNodeInfo,
  receivedNodes,
  requestedNodes,
  reachedLimit,
}: {
  storedNodeInfo: IDToNodeInfo | undefined;
  receivedNodes: Map<string, FetchedNodeData>;
  requestedNodes: Set<string>;
  reachedLimit: boolean;
}): IDToNodeInfo {
  const copiedMap = new Map<string, NodeData>([...(storedNodeInfo ?? [])]);

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
        copiedMap.set(id, { events: [], status: 'received', terminated: false });
      }
    }
  }

  // for the nodes we got results for, create a new array with the contents of those events
  for (const [id, info] of receivedNodes.entries()) {
    copiedMap.set(id, {
      events: [...info.events],
      status: 'received',
      terminated: info.terminated,
    });
  }

  return copiedMap;
}

/**
 * Checks to see if a set of node IDs exists in state's node data.
 *
 * @param baseNodes the node data map from state
 * @param nodesToCheck a set of node IDs
 */
export function idsNotInBase(
  baseNodes: IDToNodeInfo | undefined,
  nodesToCheck: Set<string>
): Set<string> {
  const result = new Set<string>();

  for (const id of nodesToCheck.values()) {
    if (!baseNodes || !baseNodes.has(id)) {
      result.add(id);
    }
  }

  return result;
}

/**
 * This is used for displaying information in the node panel mainly and we should be able to remove it eventually.
 *
 *
 * @param data node data for a specific node ID
 * @returns the first event or undefined if the node data passed in was undefined
 */
export function firstEvent(data: NodeData | undefined) {
  return !data || data.status !== 'received' || data.events.length <= 0
    ? undefined
    : data.events[0];
}
