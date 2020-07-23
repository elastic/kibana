/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockEndpointEvent } from './endpoint_event';
import { ResolverTree, ResolverEvent } from '../../../../common/endpoint/types';

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
    entityID: originID,
    name: 'c',
    parentEntityId: 'none',
    timestamp: 0,
  });
  const firstChild: ResolverEvent = mockEndpointEvent({
    entityID: firstChildID,
    name: 'd',
    parentEntityId: originID,
    timestamp: 1,
  });
  const secondChild: ResolverEvent = mockEndpointEvent({
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
