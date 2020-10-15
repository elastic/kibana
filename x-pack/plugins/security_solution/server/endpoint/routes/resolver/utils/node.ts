/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SafeResolverAncestry,
  SafeResolverTree,
  ResolverRelatedAlerts,
  SafeResolverChildren,
  SafeResolverLifecycleNode,
  SafeResolverEvent,
  SafeResolverChildNode,
  ResolverPaginatedEvents,
} from '../../../../../common/endpoint/types';

/**
 * Creates an object that the events handler would return
 *
 * @param events array of events
 * @param nextEvent the cursor to retrieve the next event
 */
export function createEvents(
  events: SafeResolverEvent[] = [],
  nextEvent: string | null = null
): ResolverPaginatedEvents {
  return { events, nextEvent };
}

/**
 * Creates an alert object that the alerts handler would return
 *
 * @param entityID the entity_id for these related events
 * @param alerts array of alerts
 * @param nextAlert the cursor to retrieve the next alert
 */
export function createRelatedAlerts(
  entityID: string,
  alerts: SafeResolverEvent[] = [],
  nextAlert: string | null = null
): ResolverRelatedAlerts {
  return { entityID, alerts, nextAlert };
}

/**
 * Creates a child node that would be used in the child handler response
 *
 * @param entityID the entity_id of the child
 */
export function createChild(entityID: string): SafeResolverChildNode {
  const lifecycle = createLifecycle(entityID, []);
  return {
    ...lifecycle,
  };
}

/**
 * Creates an empty ancestry response structure.
 */
export function createAncestry(): SafeResolverAncestry {
  return { ancestors: [], nextAncestor: null };
}

/**
 * Creates a lifecycle node for use in the ancestry or child handlers
 *
 * @param id the entity_id that these lifecycle nodes should have
 * @param lifecycle an array of lifecycle events
 */
export function createLifecycle(
  entityID: string,
  lifecycle: SafeResolverEvent[]
): SafeResolverLifecycleNode {
  return { entityID, lifecycle };
}

/**
 * Creates a resolver children response.
 *
 * @param nodes the child nodes to add to the ResolverChildren response
 * @param nextChild the cursor for the response
 */
export function createChildren(
  nodes: SafeResolverChildNode[] = [],
  nextChild: string | null = null
): SafeResolverChildren {
  return { childNodes: nodes, nextChild };
}

/**
 * Creates an empty `Tree` response structure that the tree handler would return
 *
 * @param entityID the entity_id of the tree's origin node
 */
export function createTree(entityID: string): SafeResolverTree {
  return {
    entityID,
    children: {
      childNodes: [],
      nextChild: null,
    },
    relatedAlerts: {
      alerts: [],
      nextAlert: null,
    },
    lifecycle: [],
    ancestry: {
      ancestors: [],
      nextAncestor: null,
    },
    stats: {
      totalAlerts: 0,
      events: {
        total: 0,
        byCategory: {},
      },
    },
  };
}
