/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockEndpointEvent } from './endpoint_event';
import {
  SafeResolverEvent,
  NewResolverTree,
  ResolverNode,
  ResolverRelatedEvents,
} from '../../../common/endpoint/types';
import * as eventModel from '../../../common/endpoint/models/event';
import * as nodeModel from '../../../common/endpoint/models/node';
import { mockResolverNode } from './resolver_node';

export function mockTreeWithOneNodeAndTwoPagesOfRelatedEvents({ originID }: { originID: string }): {
  nodes: ResolverNode[];
  events: SafeResolverEvent[];
} {
  const timestamp = 1600863932318;
  const nodeName = 'c';
  const eventsToGenerate = 30;
  const events = [];

  // page size is currently 25
  for (let i = 0; i < eventsToGenerate; i++) {
    const newEvent = mockEndpointEvent({
      entityID: originID,
      eventID: `test-${i}`,
      eventType: 'access',
      eventCategory: 'registry',
      timestamp,
    });
    events.push(newEvent);
  }

  const originNode: ResolverNode = mockResolverNode({
    id: originID,
    name: nodeName,
    timestamp,
    stats: { total: eventsToGenerate, byCategory: { registry: eventsToGenerate } },
  });

  const treeResponse = [originNode];

  return {
    nodes: treeResponse,
    events,
  };
}

export function mockTreeWith2AncestorsAndNoChildren({
  originID,
  firstAncestorID,
  secondAncestorID,
}: {
  secondAncestorID: string;
  firstAncestorID: string;
  originID: string;
}): NewResolverTree {
  const secondAncestorNode: ResolverNode = mockResolverNode({
    id: secondAncestorID,
    name: 'a',
    timestamp: 1600863932317,
  });

  const firstAncestorNode: ResolverNode = mockResolverNode({
    id: firstAncestorID,
    name: 'b',
    parentID: secondAncestorID,
    timestamp: 1600863932317,
  });

  const originNode: ResolverNode = mockResolverNode({
    id: originID,
    name: 'c',
    parentID: firstAncestorID,
    timestamp: 1600863932318,
    stats: { total: 2, byCategory: {} },
  });

  return {
    originID,
    nodes: [secondAncestorNode, firstAncestorNode, originNode],
  };
}

/**
 * Add/replace related event info (on origin node) for any mock ResolverTree
 */
function withRelatedEventsOnOrigin(
  tree: NewResolverTree,
  events: SafeResolverEvent[],
  nodeDataResponse: SafeResolverEvent[],
  originID: string
): {
  tree: NewResolverTree;
  relatedEvents: ResolverRelatedEvents;
  nodeDataResponse: SafeResolverEvent[];
} {
  const byCategory: Record<string, number> = {};
  const stats = {
    total: 0,
    byCategory,
  };
  for (const event of events) {
    stats.total++;
    for (const category of eventModel.eventCategory(event)) {
      stats.byCategory[category] = stats.byCategory[category] ? stats.byCategory[category] + 1 : 1;
    }
  }

  const originNode = tree.nodes.find((node) => node.id === originID);
  if (originNode) {
    originNode.stats = stats;
  }

  return {
    tree,
    relatedEvents: {
      entityID: originID,
      events,
      nextEvent: null,
    },
    nodeDataResponse,
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
}): {
  treeResponse: ResolverNode[];
  resolverTree: NewResolverTree;
  relatedEvents: ResolverRelatedEvents;
  nodeDataResponse: SafeResolverEvent[];
} {
  const originProcessEvent: SafeResolverEvent = mockEndpointEvent({
    pid: 0,
    entityID: originID,
    processName: 'c.ext',
    parentEntityID: 'none',
    timestamp: 1600863932316,
  });
  const firstChildProcessEvent: SafeResolverEvent = mockEndpointEvent({
    pid: 1,
    entityID: firstChildID,
    processName: 'd',
    parentEntityID: originID,
    timestamp: 1600863932317,
  });
  const secondChildProcessEvent: SafeResolverEvent = mockEndpointEvent({
    pid: 2,
    entityID: secondChildID,
    processName:
      'really_really_really_really_really_really_really_really_really_really_really_really_really_really_long_node_name',
    parentEntityID: originID,
    timestamp: 1600863932318,
  });

  const originNode: ResolverNode = mockResolverNode({
    id: originID,
    name: 'c.ext',
    stats: { total: 2, byCategory: {} },
    timestamp: 1600863932316,
  });

  const firstChildNode: ResolverNode = mockResolverNode({
    id: firstChildID,
    name: 'd',
    parentID: originID,
    timestamp: 1600863932317,
  });

  const secondChildNode: ResolverNode = mockResolverNode({
    id: secondChildID,
    name: 'really_really_really_really_really_really_really_really_really_really_really_really_really_really_long_node_name',
    parentID: originID,
    timestamp: 1600863932318,
  });

  const treeResponse = [originNode, firstChildNode, secondChildNode];

  return {
    treeResponse,
    resolverTree: {
      originID,
      nodes: treeResponse,
    },
    relatedEvents: {
      entityID: originID,
      events: [],
      nextEvent: null,
    },
    nodeDataResponse: [originProcessEvent, firstChildProcessEvent, secondChildProcessEvent],
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
}): NewResolverTree {
  const ancestor: ResolverNode = mockResolverNode({
    id: ancestorID,
    name: ancestorID,
    timestamp: 1600863932317,
    parentID: undefined,
  });
  const ancestorClone: ResolverNode = mockResolverNode({
    id: ancestorID,
    name: ancestorID,
    timestamp: 1600863932317,
    parentID: undefined,
  });
  const origin: ResolverNode = mockResolverNode({
    id: originID,
    name: originID,
    parentID: ancestorID,
    timestamp: 1600863932316,
  });
  const originClone: ResolverNode = mockResolverNode({
    id: originID,
    name: originID,
    parentID: ancestorID,
    timestamp: 1600863932316,
  });
  const firstChild: ResolverNode = mockResolverNode({
    id: firstChildID,
    name: firstChildID,
    parentID: originID,
    timestamp: 1600863932317,
  });
  const firstChildClone: ResolverNode = mockResolverNode({
    id: firstChildID,
    name: firstChildID,
    parentID: originID,
    timestamp: 1600863932317,
  });
  const secondChild: ResolverNode = mockResolverNode({
    id: secondChildID,
    name: secondChildID,
    parentID: originID,
    timestamp: 1600863932318,
  });
  const secondChildClone: ResolverNode = mockResolverNode({
    id: secondChildID,
    name: secondChildID,
    parentID: originID,
    timestamp: 1600863932318,
  });

  const treeResponse = [
    ancestor,
    ancestorClone,
    origin,
    originClone,
    firstChild,
    firstChildClone,
    secondChild,
    secondChildClone,
  ];

  return {
    originID,
    nodes: treeResponse,
  };
}

export function mockTreeWithNoProcessEvents(): NewResolverTree {
  return {
    originID: 'entityID',
    nodes: [],
  };
}
/**
 * first ID (to check in the mock data access layer)
 */
export const firstRelatedEventID = 'id of first related event';
/**
 * second ID (to check in the mock data access layer)
 */
export const secondRelatedEventID = 'id of second related event';

export function mockTreeWithNoAncestorsAndTwoChildrenAndRelatedEventsOnOrigin({
  originID,
  firstChildID,
  secondChildID,
}: {
  originID: string;
  firstChildID: string;
  secondChildID: string;
}) {
  const { resolverTree, nodeDataResponse } = mockTreeWithNoAncestorsAnd2Children({
    originID,
    firstChildID,
    secondChildID,
  });
  const parentEntityID = nodeModel.parentId(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    resolverTree.nodes.find((node) => node.id === originID)!
  );
  const relatedEvents = [
    mockEndpointEvent({
      entityID: originID,
      parentEntityID,
      eventID: firstRelatedEventID,
      eventType: 'access',
      eventCategory: 'registry',
    }),
    mockEndpointEvent({
      entityID: originID,
      parentEntityID,
      eventID: secondRelatedEventID,
      eventType: 'access',
      eventCategory: 'registry',
    }),
  ];
  // Add one additional event for each category
  const categories: string[] = [
    'authentication',
    'database',
    'driver',
    'file',
    'host',
    'iam',
    'intrusion_detection',
    'malware',
    'network',
    'package',
    'process',
    'web',
  ];
  for (const category of categories) {
    relatedEvents.push(
      mockEndpointEvent({
        entityID: originID,
        parentEntityID,
        eventID: `${relatedEvents.length}`,
        eventType: 'access',
        eventCategory: category,
      })
    );
  }
  return withRelatedEventsOnOrigin(resolverTree, relatedEvents, nodeDataResponse, originID);
}
