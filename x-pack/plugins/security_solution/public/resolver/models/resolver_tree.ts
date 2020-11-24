/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverTree,
  ResolverNodeStats,
  ResolverLifecycleNode,
  SafeResolverEvent,
  NewResolverTree,
  ResolverNode,
  EventStats,
} from '../../../common/endpoint/types';
import * as nodeModel from '../../../common/endpoint/models/node';

/**
 * This returns a map of nodeIds to the associated stats provided by the datasource.
 */

export function nodeStats(tree: NewResolverTree): Map<ResolverNode['id'], EventStats> {
  const stats = new Map();

  for (const node of tree.nodes) {
    if (node.stats) {
      const nodeId = nodeModel.nodeID(node);
      stats.set(nodeId, node.stats);
    }
  }
  return stats;
}

/**
 * ResolverTree is a type returned by the server.
 */

/**
 * This returns the 'LifecycleNodes' of the tree. These nodes have
 * the entityID and stats for a process. Used by `relatedEventsStats`.
 */
function lifecycleNodes(tree: ResolverTree): ResolverLifecycleNode[] {
  return [tree, ...tree.children.childNodes, ...tree.ancestry.ancestors];
}

/**
 * All the process events
 */
export function lifecycleEvents(tree: ResolverTree) {
  const events: SafeResolverEvent[] = [...tree.lifecycle];
  for (const { lifecycle } of tree.children.childNodes) {
    events.push(...lifecycle);
  }
  for (const { lifecycle } of tree.ancestry.ancestors) {
    events.push(...lifecycle);
  }
  return events;
}

/**
 * This returns a map of entity_ids to stats for the related events and alerts.
 */
export function relatedEventsStats(tree: ResolverTree): Map<string, ResolverNodeStats> {
  const nodeRelatedEventStats: Map<string, ResolverNodeStats> = new Map();
  for (const node of lifecycleNodes(tree)) {
    if (node.stats) {
      nodeRelatedEventStats.set(node.entityID, node.stats);
    }
  }
  return nodeRelatedEventStats;
}

/**
 * ResolverTree type is returned by the server. It organizes events into a complex structure. The
 * organization of events in the tree is done to associate metadata with the events. The client does not
 * use this metadata. Instead, the client flattens the tree into an array. Therefore we can safely
 * make a malformed ResolverTree for the purposes of the tests, so long as it is flattened in a predictable way.
 */
export function mock({
  nodes,
}: {
  /**
   * Events represented by the ResolverTree.
   */
  nodes: ResolverNode[];
}): NewResolverTree | null {
  if (nodes.length === 0) {
    return null;
  }
  const originNode = nodes[0];
  const originId = nodeModel.nodeID(originNode);
  if (!originId) {
    throw new Error('first mock event must include an nodeID.');
  }
  return {
    originId,
    nodes,
  };
}

/**
 * `true` if there are more children to fetch.
 * TODO: Going to need to use levelOrder or similar to identify ancestor count and child count and then compare against limit
 */
export function hasMoreChildren(resolverTree: NewResolverTree): boolean {
  return false;
  // return resolverTree.children.nextChild !== null;
}

/**
 * `true` if there are more ancestors to fetch.
 * TODO: Going to need to use levelOrder or similar to identify ancestor count and child count and then compare against limit
 */
export function hasMoreAncestors(resolverTree: NewResolverTree): boolean {
  return false;
  // return resolverTree.ancestry.nextAncestor !== null;
}
