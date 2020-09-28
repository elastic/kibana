/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockEndpointEvent } from './endpoint_event';
import { ResolverTree, SafeResolverEvent } from '../../../common/endpoint/types';
import * as eventModel from '../../../common/endpoint/models/event';

export function mockTreeWith2AncestorsAndNoChildren({
  originID,
  firstAncestorID,
  secondAncestorID,
}: {
  secondAncestorID: string;
  firstAncestorID: string;
  originID: string;
}): ResolverTree {
  const secondAncestor: SafeResolverEvent = mockEndpointEvent({
    entityID: secondAncestorID,
    processName: 'a',
    parentEntityID: 'none',
    timestamp: 1600863932316,
  });
  const firstAncestor: SafeResolverEvent = mockEndpointEvent({
    entityID: firstAncestorID,
    processName: 'b',
    parentEntityID: secondAncestorID,
    timestamp: 1600863932317,
  });
  const originEvent: SafeResolverEvent = mockEndpointEvent({
    entityID: originID,
    processName: 'c',
    parentEntityID: firstAncestorID,
    timestamp: 1600863932318,
  });
  return {
    entityID: originID,
    children: {
      childNodes: [],
      nextChild: null,
    },
    ancestry: {
      nextAncestor: null,
      ancestors: [
        { entityID: secondAncestorID, lifecycle: [secondAncestor] },
        { entityID: firstAncestorID, lifecycle: [firstAncestor] },
      ],
    },
    lifecycle: [originEvent],
    relatedEvents: { events: [], nextEvent: null },
    relatedAlerts: { alerts: [], nextAlert: null },
    stats: { events: { total: 2, byCategory: {} }, totalAlerts: 0 },
  };
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
  const secondAncestor: SafeResolverEvent = mockEndpointEvent({
    entityID: secondAncestorID,
    processName: 'a',
    parentEntityID: 'none',
    timestamp: 1600863932316,
  });
  const firstAncestor: SafeResolverEvent = mockEndpointEvent({
    entityID: firstAncestorID,
    processName: 'b',
    parentEntityID: secondAncestorID,
    timestamp: 1600863932317,
  });
  const originEvent: SafeResolverEvent = mockEndpointEvent({
    entityID: originID,
    processName: 'c',
    parentEntityID: firstAncestorID,
    timestamp: 1600863932318,
  });
  const secondAncestorTermination: SafeResolverEvent = mockEndpointEvent({
    entityID: secondAncestorID,
    processName: 'a',
    parentEntityID: 'none',
    timestamp: 1600863932316,
    eventType: 'end',
  });
  const firstAncestorTermination: SafeResolverEvent = mockEndpointEvent({
    entityID: firstAncestorID,
    processName: 'b',
    parentEntityID: secondAncestorID,
    timestamp: 1600863932317,
    eventType: 'end',
  });
  const originEventTermination: SafeResolverEvent = mockEndpointEvent({
    entityID: originID,
    processName: 'c',
    parentEntityID: firstAncestorID,
    timestamp: 1600863932318,
    eventType: 'end',
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
 * Add/replace related event info (on origin node) for any mock ResolverTree
 */
function withRelatedEventsOnOrigin(tree: ResolverTree, events: SafeResolverEvent[]): ResolverTree {
  const byCategory: Record<string, number> = {};
  const stats = {
    totalAlerts: 0,
    events: {
      total: 0,
      byCategory,
    },
  };
  for (const event of events) {
    stats.events.total++;
    for (const category of eventModel.eventCategory(event)) {
      stats.events.byCategory[category] = stats.events.byCategory[category]
        ? stats.events.byCategory[category] + 1
        : 1;
    }
  }
  return {
    ...tree,
    stats,
    relatedEvents: {
      events,
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
  const origin: SafeResolverEvent = mockEndpointEvent({
    pid: 0,
    entityID: originID,
    processName: 'c.ext',
    parentEntityID: 'none',
    timestamp: 1600863932316,
  });
  const firstChild: SafeResolverEvent = mockEndpointEvent({
    pid: 1,
    entityID: firstChildID,
    processName: 'd',
    parentEntityID: originID,
    timestamp: 1600863932317,
  });
  const secondChild: SafeResolverEvent = mockEndpointEvent({
    pid: 2,
    entityID: secondChildID,
    processName: 'e',
    parentEntityID: originID,
    timestamp: 1600863932318,
  });

  return {
    entityID: originID,
    children: {
      childNodes: [
        { entityID: firstChildID, lifecycle: [firstChild] },
        { entityID: secondChildID, lifecycle: [secondChild] },
      ],
      nextChild: null,
    },
    ancestry: {
      ancestors: [],
      nextAncestor: null,
    },
    lifecycle: [origin],
    relatedEvents: { events: [], nextEvent: null },
    relatedAlerts: { alerts: [], nextAlert: null },
    stats: { events: { total: 2, byCategory: {} }, totalAlerts: 0 },
  };
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
  const ancestor: SafeResolverEvent = mockEndpointEvent({
    entityID: ancestorID,
    processName: ancestorID,
    timestamp: 1600863932317,
    parentEntityID: undefined,
  });
  const ancestorClone: SafeResolverEvent = mockEndpointEvent({
    entityID: ancestorID,
    processName: ancestorID,
    timestamp: 1600863932317,
    parentEntityID: undefined,
  });
  const origin: SafeResolverEvent = mockEndpointEvent({
    entityID: originID,
    processName: originID,
    parentEntityID: ancestorID,
    timestamp: 1600863932316,
  });
  const originClone: SafeResolverEvent = mockEndpointEvent({
    entityID: originID,
    processName: originID,
    parentEntityID: ancestorID,
    timestamp: 1600863932316,
  });
  const firstChild: SafeResolverEvent = mockEndpointEvent({
    entityID: firstChildID,
    processName: firstChildID,
    parentEntityID: originID,
    timestamp: 1600863932317,
  });
  const firstChildClone: SafeResolverEvent = mockEndpointEvent({
    entityID: firstChildID,
    processName: firstChildID,
    parentEntityID: originID,
    timestamp: 1600863932317,
  });
  const secondChild: SafeResolverEvent = mockEndpointEvent({
    entityID: secondChildID,
    processName: secondChildID,
    parentEntityID: originID,
    timestamp: 1600863932318,
  });
  const secondChildClone: SafeResolverEvent = mockEndpointEvent({
    entityID: secondChildID,
    processName: secondChildID,
    parentEntityID: originID,
    timestamp: 1600863932318,
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
  const parentEntityID = eventModel.parentEntityIDSafeVersion(baseTree.lifecycle[0]);
  const relatedEvents = [
    mockEndpointEvent({
      entityID: originID,
      parentEntityID,
      eventID: 'first related event',
      eventType: 'access',
      eventCategory: 'registry',
    }),
    mockEndpointEvent({
      entityID: originID,
      parentEntityID,
      eventID: 'second related event',
      eventType: 'access',
      eventCategory: 'registry',
    }),
  ];
  return withRelatedEventsOnOrigin(baseTree, relatedEvents);
}
