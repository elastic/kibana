/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverEvent,
  ResolverAncestry,
  ResolverLifecycleNode,
  ResolverRelatedEvents,
  ResolverTree,
  ResolverChildNode,
  ResolverRelatedAlerts,
  ResolverChildren,
} from '../../../../../common/endpoint/types';

/**
 * Creates a related event object that the related events handler would return
 *
 * @param entityID the entity_id for these related events
 * @param events array of related events
 * @param nextEvent the cursor to retrieve the next related event
 */
export function createRelatedEvents(
  entityID: string,
  events: ResolverEvent[] = [],
  nextEvent: string | null = null
): ResolverRelatedEvents {
  return { entityID, events, nextEvent };
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
  alerts: ResolverEvent[] = [],
  nextAlert: string | null = null
): ResolverRelatedAlerts {
  return { entityID, alerts, nextAlert };
}

/**
 * Creates a child node that would be used in the child handler response
 *
 * @param entityID the entity_id of the child
 */
export function createChild(entityID: string): ResolverChildNode {
  const lifecycle = createLifecycle(entityID, []);
  return {
    ...lifecycle,
  };
}

/**
 * Creates an empty ancestry response structure.
 */
export function createAncestry(): ResolverAncestry {
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
  lifecycle: ResolverEvent[]
): ResolverLifecycleNode {
  return { entityID, lifecycle };
}

/**
 * Creates a resolver children response.
 *
 * @param nodes the child nodes to add to the ResolverChildren response
 * @param nextChild the cursor for the response
 */
export function createChildren(
  nodes: ResolverChildNode[] = [],
  nextChild: string | null = null
): ResolverChildren {
  return { childNodes: nodes, nextChild };
}

/**
 * Creates an empty `Tree` response structure that the tree handler would return
 *
 * @param entityID the entity_id of the tree's origin node
 */
export function createTree(entityID: string): ResolverTree {
  return {
    entityID,
    children: {
      childNodes: [],
      nextChild: null,
    },
    relatedEvents: {
      events: [],
      nextEvent: null,
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
