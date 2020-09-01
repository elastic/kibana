/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockEndpointEvent } from './endpoint_event';
import { ResolverTree, ResolverEvent, SafeResolverEvent } from '../../../common/endpoint/types';

export function mockTreeWith2AncestorsAndNoChildren({
  originID,
  firstAncestorID,
  secondAncestorID,
}: {
  secondAncestorID: string;
  firstAncestorID: string;
  originID: string;
}): ResolverTree {
  const secondAncestor: ResolverEvent = mockEndpointEvent({
    entityID: secondAncestorID,
    name: 'a',
    parentEntityId: 'none',
    timestamp: 0,
  });
  const firstAncestor: ResolverEvent = mockEndpointEvent({
    entityID: firstAncestorID,
    name: 'b',
    parentEntityId: secondAncestorID,
    timestamp: 1,
  });
  const originEvent: ResolverEvent = mockEndpointEvent({
    entityID: originID,
    name: 'c',
    parentEntityId: firstAncestorID,
    timestamp: 2,
  });
  return ({
    entityID: originID,
    children: {
      childNodes: [],
    },
    ancestry: {
      ancestors: [{ lifecycle: [secondAncestor] }, { lifecycle: [firstAncestor] }],
    },
    lifecycle: [originEvent],
  } as unknown) as ResolverTree;
}

export function mockTreeWithAllProcessesTerminated({
  originID,
  firstAncestorID,
  secondAncestorID,
}: {
  secondAncestorID: string;
  firstAncestorID: string;
  originID: string;
}): ResolverTree {
  const secondAncestor: ResolverEvent = mockEndpointEvent({
    entityID: secondAncestorID,
    name: 'a',
    parentEntityId: 'none',
    timestamp: 0,
  });
  const firstAncestor: ResolverEvent = mockEndpointEvent({
    entityID: firstAncestorID,
    name: 'b',
    parentEntityId: secondAncestorID,
    timestamp: 1,
  });
  const originEvent: ResolverEvent = mockEndpointEvent({
    entityID: originID,
    name: 'c',
    parentEntityId: firstAncestorID,
    timestamp: 2,
  });
  const secondAncestorTermination: ResolverEvent = mockEndpointEvent({
    entityID: secondAncestorID,
    name: 'a',
    parentEntityId: 'none',
    timestamp: 0,
    lifecycleType: 'end',
  });
  const firstAncestorTermination: ResolverEvent = mockEndpointEvent({
    entityID: firstAncestorID,
    name: 'b',
    parentEntityId: secondAncestorID,
    timestamp: 1,
    lifecycleType: 'end',
  });
  const originEventTermination: ResolverEvent = mockEndpointEvent({
    entityID: originID,
    name: 'c',
    parentEntityId: firstAncestorID,
    timestamp: 2,
    lifecycleType: 'end',
  });
  return ({
    entityID: originID,
    children: {
      childNodes: [],
    },
    ancestry: {
      ancestors: [
        { lifecycle: [secondAncestor, secondAncestorTermination] },
        { lifecycle: [firstAncestor, firstAncestorTermination] },
      ],
    },
    lifecycle: [originEvent, originEventTermination],
  } as unknown) as ResolverTree;
}

/**
 * A valid category for a related event. E.g. "registry", "network", "file"
 */
type RelatedEventCategory = string;
/**
 * A valid type for a related event. E.g. "start", "end", "access"
 */
type RelatedEventType = string;

/**
 * Add/replace related event info (on origin node) for any mock ResolverTree
 *
 * @param treeToAddRelatedEventsTo the ResolverTree to modify
 * @param relatedEventsToAddByCategoryAndType Iterable of `[category, type]` pairs describing related events. e.g. [['dns','info'],['registry','access']]
 */
function withRelatedEventsOnOrigin(
  treeToAddRelatedEventsTo: ResolverTree,
  relatedEventsToAddByCategoryAndType: Iterable<[RelatedEventCategory, RelatedEventType]>
): ResolverTree {
  const events: SafeResolverEvent[] = [];
  const byCategory: Record<string, number> = {};
  const stats = {
    totalAlerts: 0,
    events: {
      total: 0,
      byCategory,
    },
  };
  for (const [category, type] of relatedEventsToAddByCategoryAndType) {
    events.push({
      '@timestamp': 1,
      event: {
        kind: 'event',
        type,
        category,
        id: 'xyz',
      },
      process: {
        entity_id: treeToAddRelatedEventsTo.entityID,
      },
    });
    stats.events.total++;
    stats.events.byCategory[category] = stats.events.byCategory[category]
      ? stats.events.byCategory[category] + 1
      : 1;
  }
  return {
    ...treeToAddRelatedEventsTo,
    stats,
    relatedEvents: {
      events: events as ResolverEvent[],
      nextEvent: null,
    },
  };
}

export function mockTreeWithNoAncestorsAnd2Children({
  originID,
  firstChildID,
  secondChildID,
}: {
  originID: string;
  firstChildID: string;
  secondChildID: string;
}): ResolverTree {
  const origin: ResolverEvent = mockEndpointEvent({
    pid: 0,
    entityID: originID,
    name: 'c.ext',
    parentEntityId: 'none',
    timestamp: 0,
  });
  const firstChild: ResolverEvent = mockEndpointEvent({
    pid: 1,
    entityID: firstChildID,
    name: 'd',
    parentEntityId: originID,
    timestamp: 1,
  });
  const secondChild: ResolverEvent = mockEndpointEvent({
    pid: 2,
    entityID: secondChildID,
    name: 'e',
    parentEntityId: originID,
    timestamp: 2,
  });

  return ({
    entityID: originID,
    children: {
      childNodes: [{ lifecycle: [firstChild] }, { lifecycle: [secondChild] }],
    },
    ancestry: {
      ancestors: [],
    },
    lifecycle: [origin],
  } as unknown) as ResolverTree;
}

/**
 * Creates a mock tree w/ 2 'graphable' events per node. This simulates the scenario where data has been duplicated in the response from the server.
 */
export function mockTreeWith1AncestorAnd2ChildrenAndAllNodesHave2GraphableEvents({
  ancestorID,
  originID,
  firstChildID,
  secondChildID,
}: {
  ancestorID: string;
  originID: string;
  firstChildID: string;
  secondChildID: string;
}): ResolverTree {
  const ancestor: ResolverEvent = mockEndpointEvent({
    entityID: ancestorID,
    name: ancestorID,
    timestamp: 1,
    parentEntityId: undefined,
  });
  const ancestorClone: ResolverEvent = mockEndpointEvent({
    entityID: ancestorID,
    name: ancestorID,
    timestamp: 1,
    parentEntityId: undefined,
  });
  const origin: ResolverEvent = mockEndpointEvent({
    entityID: originID,
    name: originID,
    parentEntityId: ancestorID,
    timestamp: 0,
  });
  const originClone: ResolverEvent = mockEndpointEvent({
    entityID: originID,
    name: originID,
    parentEntityId: ancestorID,
    timestamp: 0,
  });
  const firstChild: ResolverEvent = mockEndpointEvent({
    entityID: firstChildID,
    name: firstChildID,
    parentEntityId: originID,
    timestamp: 1,
  });
  const firstChildClone: ResolverEvent = mockEndpointEvent({
    entityID: firstChildID,
    name: firstChildID,
    parentEntityId: originID,
    timestamp: 1,
  });
  const secondChild: ResolverEvent = mockEndpointEvent({
    entityID: secondChildID,
    name: secondChildID,
    parentEntityId: originID,
    timestamp: 2,
  });
  const secondChildClone: ResolverEvent = mockEndpointEvent({
    entityID: secondChildID,
    name: secondChildID,
    parentEntityId: originID,
    timestamp: 2,
  });

  return ({
    entityID: originID,
    children: {
      childNodes: [
        { lifecycle: [firstChild, firstChildClone] },
        { lifecycle: [secondChild, secondChildClone] },
      ],
    },
    ancestry: {
      ancestors: [{ lifecycle: [ancestor, ancestorClone] }],
    },
    lifecycle: [origin, originClone],
  } as unknown) as ResolverTree;
}

export function mockTreeWithNoProcessEvents(): ResolverTree {
  return {
    entityID: 'entityID',
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

export function mockTreeWithNoAncestorsAndTwoChildrenAndRelatedEventsOnOrigin({
  originID,
  firstChildID,
  secondChildID,
}: {
  originID: string;
  firstChildID: string;
  secondChildID: string;
}) {
  const baseTree = mockTreeWithNoAncestorsAnd2Children({
    originID,
    firstChildID,
    secondChildID,
  });
  const withRelatedEvents: Array<[string, string]> = [
    ['registry', 'access'],
    ['registry', 'access'],
  ];
  return withRelatedEventsOnOrigin(baseTree, withRelatedEvents);
}
