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

export function createRelatedEvents(
  id: string,
  events: ResolverEvent[] = [],
  nextEvent: string | null = null
): ResolverRelatedEvents {
  return { id, events, nextEvent };
}

export function createChild(id: string): ChildNode {
  const lifecycle = createLifecycle(id, []);
  return {
    ...lifecycle,
    nextChild: null,
  };
}

export function createAncestry(): ResolverAncestry {
  return { ancestors: [], nextAncestor: null };
}

export function createLifecycle(id: string, lifecycle: ResolverEvent[]): LifecycleNode {
  return { id, lifecycle };
}

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
