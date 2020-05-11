/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverEvent,
  ResolverNode,
  AncestorEvents,
  LifecycleEvents,
  RelatedEvents,
} from '../../../../common/types';

export function createRelatedEvents(
  id: string,
  events: ResolverEvent[] = [],
  nextEvent: string | null = null
): RelatedEvents {
  return { id, events, nextEvent };
}

export function createAncestorEvents(): AncestorEvents {
  return { ancestors: [], nextAncestor: null };
}

export function createLifecycleEvents(id: string, lifecycle: ResolverEvent[]): LifecycleEvents {
  return { id, lifecycle };
}

export function createNode(id: string): ResolverNode {
  return { id, children: [], pagination: {}, events: [], lifecycle: [], ancestors: [] };
}
