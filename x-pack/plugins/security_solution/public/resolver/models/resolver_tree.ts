/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverTree,
  ResolverEvent,
  ResolverNodeStats,
  ResolverLifecycleNode,
} from '../../../common/endpoint/types';
import { uniquePidForProcess } from './process_event';

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
  const events: ResolverEvent[] = [...tree.lifecycle];
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
  const nodeStats: Map<string, ResolverNodeStats> = new Map();
  for (const node of lifecycleNodes(tree)) {
    if (node.stats) {
      nodeStats.set(node.entityID, node.stats);
    }
  }
  return nodeStats;
}

/**
 * ResolverTree type is returned by the server. It organizes events into a complex structure. The
 * organization of events in the tree is done to associate metadata with the events. The client does not
 * use this metadata. Instead, the client flattens the tree into an array. Therefore we can safely
 * make a malformed ResolverTree for the purposes of the tests, so long as it is flattened in a predictable way.
 */
export function mock({
  events,
  cursors = { childrenNextChild: null, ancestryNextAncestor: null },
}: {
  /**
   * Events represented by the ResolverTree.
   */
  events: ResolverEvent[];
  /**
   * Optionally provide cursors for the 'children' and 'ancestry' edges.
   */
  cursors?: { childrenNextChild: string | null; ancestryNextAncestor: string | null };
}): ResolverTree | null {
  if (events.length === 0) {
    return null;
  }
  const first = events[0];
  return {
    entityID: uniquePidForProcess(first),
    // Required
    children: {
      childNodes: [],
      nextChild: cursors.childrenNextChild,
    },
    // Required
    relatedEvents: {
      events: [],
      nextEvent: null,
    },
    // Required
    relatedAlerts: {
      alerts: [],
      nextAlert: null,
    },
    // Required
    ancestry: {
      ancestors: [],
      nextAncestor: cursors.ancestryNextAncestor,
    },
    // Normally, this would have only certain events, but for testing purposes, it will have all events, since
    // the position of events in the ResolverTree is irrelevant.
    lifecycle: events,
    // Required
    stats: {
      events: {
        total: 0,
        byCategory: {},
      },
      totalAlerts: 0,
    },
  };
}

/**
 * `true` if there are more children to fetch.
 */
export function hasMoreChildren(resolverTree: ResolverTree): boolean {
  return resolverTree.children.nextChild !== null;
}

/**
 * `true` if there are more ancestors to fetch.
 */
export function hasMoreAncestors(resolverTree: ResolverTree): boolean {
  return resolverTree.ancestry.nextAncestor !== null;
}
