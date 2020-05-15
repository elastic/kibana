/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverEvent,
  ResolverAncestry,
  LifecycleNode,
  ResolverRelatedEvents,
  ResolverTree,
  ChildNode,
} from '../../../../common/types';

/**
 * Creates a related event object that the related events handler would return
 *
 * @param id the entity_id for these related events
 * @param events array of related events
 * @param nextEvent the cursor to retrieve the next related event
 */
export function createRelatedEvents(
  id: string,
  events: ResolverEvent[] = [],
  nextEvent: string | null = null
): ResolverRelatedEvents {
  return { id, events, nextEvent };
}

/**
 * Creates a child node that would be used in the child handler response
 *
 * @param id the entity_id of the child
 */
export function createChild(id: string): ChildNode {
  const lifecycle = createLifecycle(id, []);
  return {
    ...lifecycle,
    nextChild: null,
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
export function createLifecycle(id: string, lifecycle: ResolverEvent[]): LifecycleNode {
  return { id, lifecycle };
}

/**
 * Creates an empty `Tree` response structure that the tree handler would return
 *
 * @param id the entity_id of the tree's origin node
 */
export function createTree(id: string): ResolverTree {
  return {
    id,
    children: {
      childNodes: [],
      nextChild: null,
    },
    relatedEvents: {
      events: [],
      nextEvent: null,
    },
    lifecycle: [],
    ancestry: {
      ancestors: [],
      nextAncestor: null,
    },
    stats: {
      totalAlerts: 0,
      totalEvents: 0,
    },
  };
}
