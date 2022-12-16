/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityIDSafeVersion } from '../../../common/endpoint/models/event';
import type { SafeResolverEvent } from '../../../common/endpoint/types';
import type { FetchedNodeData, NodeData } from '../types';
import { isTerminatedProcess } from './process_event';

/**
 * Creates a copy of the node data map and initializes the specified IDs to an empty object with status requested.
 *
 * @param storedNodeInfo the node data from state
 * @param requestedNodes a set of IDs that are being requested
 */
export function setRequestedNodes(
  storedNodeInfo = new Map<string, NodeData>(),
  requestedNodes: Set<string>
): Map<string, NodeData> {
  const requestedNodesArray = Array.from(requestedNodes);
  return new Map<string, NodeData>([
    ...storedNodeInfo,
    ...requestedNodesArray.map((id: string): [string, NodeData] => [
      id,
      { events: [], status: 'loading' },
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
  storedNodeInfo = new Map<string, NodeData>(),
  errorNodes: Set<string>
): Map<string, NodeData> {
  const errorNodesArray = Array.from(errorNodes);
  return new Map<string, NodeData>([
    ...storedNodeInfo,
    ...errorNodesArray.map((id: string): [string, NodeData] => [
      id,
      { events: [], status: 'error' },
    ]),
  ]);
}

/**
 * Marks the node id to be reloaded by the middleware. It removes the entry in the map to mark it to be reloaded.
 *
 * @param storedNodeInfo the node data from state
 * @param nodeID the ID to remove from state to mark it to be reloaded in the middleware.
 */
export function setReloadedNodes(
  storedNodeInfo: Map<string, NodeData> = new Map<string, NodeData>(),
  nodeID: string
): Map<string, NodeData> {
  const newData = new Map<string, NodeData>([...storedNodeInfo]);
  newData.delete(nodeID);
  return newData;
}

function groupByID(events: SafeResolverEvent[]): Map<string, FetchedNodeData> {
  // group the returned events by their ID
  const newData = new Map<string, FetchedNodeData>();
  for (const result of events) {
    const id = entityIDSafeVersion(result);
    const terminated = isTerminatedProcess(result);
    if (id) {
      const info = newData.get(id);
      if (!info) {
        newData.set(id, { events: [result], terminated });
      } else {
        info.events.push(result);
        /**
         * Track whether we have seen a termination event. It is useful to do this here rather than in a selector
         * because the selector would have to loop over all events each time a new node's data is received.
         */
        info.terminated = info.terminated || terminated;
      }
    }
  }

  return newData;
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
  storedNodeInfo = new Map<string, NodeData>(),
  receivedEvents,
  requestedNodes,
  numberOfRequestedEvents,
}: {
  storedNodeInfo: Map<string, NodeData> | undefined;
  receivedEvents: SafeResolverEvent[];
  requestedNodes: Set<string>;
  numberOfRequestedEvents: number;
}): Map<string, NodeData> {
  const copiedMap = new Map<string, NodeData>([...storedNodeInfo]);
  const reachedLimit = receivedEvents.length >= numberOfRequestedEvents;
  const receivedNodes: Map<string, FetchedNodeData> = groupByID(receivedEvents);

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
        copiedMap.set(id, { events: [], status: 'running' });
      }
    }
  }

  // for the nodes we got results for, create a new array with the contents of those events
  for (const [id, info] of receivedNodes.entries()) {
    copiedMap.set(id, {
      events: [...info.events],
      status: info.terminated ? 'terminated' : 'running',
    });
  }

  return copiedMap;
}

/**
 * This is used for displaying information in the node panel mainly and we should be able to remove it eventually in
 * favor of showing all the node data associated with a node in the tree.
 *
 * NOTE: The events are actually in descending order by the timestamp field because of the `/events` api. So this
 * returns the "newest" event.
 *
 * @param data node data for a specific node ID
 * @returns the first event or undefined if the node data passed in was undefined
 */
export function firstEvent(data: NodeData | undefined): SafeResolverEvent | undefined {
  return !data || data.status === 'loading' || data.status === 'error' || data.events.length <= 0
    ? undefined
    : data.events[0];
}
