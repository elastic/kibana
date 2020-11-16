/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverGraph,
  ResolverGraphNode,
  ResolverTree,
  ResolverChildNode,
  SafeResolverEvent,
  EventStats,
} from '../../../common/endpoint/types';
import * as eventModel from '../../../common/endpoint/models/event';
import * as nodeModel from '../../../common/endpoint/models/node';

/**
 * Applies a predicate function to all nodes in the graph to determine which ones to show in the inactive ('light blue') state
 * TODO: Predicate will probably be kql based (i.e.) dataSource.type: 'someValue' => process.category: 'process' AND process.event.type: 'end'
 */
export function nodesToShowAsInactive(
  graph: ResolverGraph | undefined,
  predicate?: (node: ResolverGraphNode) => boolean
) {
  if (graph && predicate) {
    return graph.nodes.filter(predicate);
  } else {
    return [];
  }
}

/**
 * This returns a map of nodeIds to the associated stats provided by the datasource.
 */
export function nodeRelatedStats(
  graph: ResolverGraph
): Map<ResolverGraphNode['nodeId'], EventStats> {
  const nodeStats = new Map();

  for (const node of graph.nodes) {
    if (node.stats) {
      const nodeId = nodeModel.nodeID(node);
      nodeStats.set(nodeId, node.stats);
    }
  }
  return nodeStats;
}

// TODO: Update mock to match new structure
/**
 * ResolverTree type is returned by the server. It organizes events into a complex structure. The
 * organization of events in the tree is done to associate metadata with the events. The client does not
 * use this metadata. Instead, the client flattens the tree into an array. Therefore we can safely
 * make a malformed ResolverTree for the purposes of the tests, so long as it is flattened in a predictable way.
 */
export function mock({
  events,
  cursors = { childrenNextChild: null, ancestryNextAncestor: null },
  children = [],
}: {
  /**
   * Events represented by the ResolverTree.
   */
  events: SafeResolverEvent[];
  children?: ResolverChildNode[];
  /**
   * Optionally provide cursors for the 'children' and 'ancestry' edges.
   */
  cursors?: { childrenNextChild: string | null; ancestryNextAncestor: string | null };
}): ResolverTree | null {
  if (events.length === 0) {
    return null;
  }
  const first = events[0];
  const entityID = eventModel.entityIDSafeVersion(first);
  if (!entityID) {
    throw new Error('first mock event must include an entityID.');
  }
  return {
    entityID,
    // Required
    children: {
      childNodes: children,
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

// TODO: Define how we want to discover additional children
/**
 * `true` if there are more children to fetch.
 */
export function hasMoreChildren(resolverGraph: ResolverGraph): boolean {
  return false;
  // return resolverTree.children.nextChild !== null;
}

// TODO: Define how we want to discover additional ancestors
/**
 * `true` if there are more ancestors to fetch.
 */
export function hasMoreAncestors(resolverGraph: ResolverGraph): boolean {
  return false;
  // return resolverTree.ancestry.nextAncestor !== null;
}
