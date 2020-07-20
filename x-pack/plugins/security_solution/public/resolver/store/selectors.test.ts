/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverState } from '../types';
import { createStore } from 'redux';
import { ResolverAction } from './actions';
import { resolverReducer } from './reducer';
import * as selectors from './selectors';
import { EndpointEvent, ResolverEvent, ResolverTree } from '../../../common/endpoint/types';

describe('resolver selectors', () => {
  const actions: ResolverAction[] = [];

  /**
   * Get state, given an ordered collection of actions.
   */
  const state: () => ResolverState = () => {
    const store = createStore(resolverReducer);
    for (const action of actions) {
      store.dispatch(action);
    }
    return store.getState();
  };
  describe('ariaFlowtoNodeID', () => {
    describe('with a tree with no descendants and 2 ancestors', () => {
      const originID = 'c';
      const firstAncestorID = 'b';
      const secondAncestorID = 'a';
      beforeEach(() => {
        actions.push({
          type: 'serverReturnedResolverData',
          payload: {
            result: treeWith2AncestorsAndNoChildren({
              originID,
              firstAncestorID,
              secondAncestorID,
            }),
            // this value doesn't matter
            databaseDocumentID: '',
          },
        });
      });
      describe('when all nodes are in view', () => {
        beforeEach(() => {
          const size = 1000000;
          actions.push({
            // set the size of the camera
            type: 'userSetRasterSize',
            payload: [size, size],
          });
        });
        it('should return no flowto for the second ancestor', () => {
          expect(selectors.ariaFlowtoNodeID(state())(0)(secondAncestorID)).toBe(null);
        });
        it('should return no flowto for the first ancestor', () => {
          expect(selectors.ariaFlowtoNodeID(state())(0)(firstAncestorID)).toBe(null);
        });
        it('should return no flowto for the origin', () => {
          expect(selectors.ariaFlowtoNodeID(state())(0)(originID)).toBe(null);
        });
      });
    });
    describe('with a tree with 2 children and no ancestors', () => {
      const originID = 'c';
      const firstChildID = 'd';
      const secondChildID = 'e';
      beforeEach(() => {
        actions.push({
          type: 'serverReturnedResolverData',
          payload: {
            result: treeWithNoAncestorsAnd2Children({ originID, firstChildID, secondChildID }),
            // this value doesn't matter
            databaseDocumentID: '',
          },
        });
      });
      describe('when all nodes are in view', () => {
        beforeEach(() => {
          const rasterSize = 1000000;
          actions.push({
            // set the size of the camera
            type: 'userSetRasterSize',
            payload: [rasterSize, rasterSize],
          });
        });
        it('should return no flowto for the origin', () => {
          expect(selectors.ariaFlowtoNodeID(state())(0)(originID)).toBe(null);
        });
        it('should return the second child as the flowto for the first child', () => {
          expect(selectors.ariaFlowtoNodeID(state())(0)(firstChildID)).toBe(secondChildID);
        });
        it('should return no flowto for second child', () => {
          expect(selectors.ariaFlowtoNodeID(state())(0)(secondChildID)).toBe(null);
        });
      });
      describe('when only the origin and first child are in view', () => {
        beforeEach(() => {
          // set the raster size
          const rasterSize = 1000000;
          actions.push({
            // set the size of the camera
            type: 'userSetRasterSize',
            payload: [rasterSize, rasterSize],
          });

          // get the layout
          const layout = selectors.layout(state());

          // find the position of the second child
          const secondChild = selectors.processEventForID(state())(secondChildID);
          const positionOfSecondChild = layout.processNodePositions.get(secondChild!)!;

          // the child is indexed by an AABB that extends -720/2 to the left
          const leftSideOfSecondChildAABB = positionOfSecondChild[0] - 720 / 2;

          // adjust the camera so that it doesn't quite see the second child
          actions.push({
            // set the position of the camera so that the left edge of the second child is at the right edge
            // of the viewable area
            type: 'userSetPositionOfCamera',
            payload: [rasterSize / -2 + leftSideOfSecondChildAABB, 0],
          });
        });
        it('the origin should be in view', () => {
          const origin = selectors.processEventForID(state())(originID)!;
          expect(
            selectors.visibleNodesAndEdgeLines(state())(0).processNodePositions.has(origin)
          ).toBe(true);
        });
        it('the first child should be in view', () => {
          const firstChild = selectors.processEventForID(state())(firstChildID)!;
          expect(
            selectors.visibleNodesAndEdgeLines(state())(0).processNodePositions.has(firstChild)
          ).toBe(true);
        });
        it('the second child should not be in view', () => {
          const secondChild = selectors.processEventForID(state())(secondChildID)!;
          expect(
            selectors.visibleNodesAndEdgeLines(state())(0).processNodePositions.has(secondChild)
          ).toBe(false);
        });
        it('should return nothing as the flowto for the first child', () => {
          expect(selectors.ariaFlowtoNodeID(state())(0)(firstChildID)).toBe(null);
        });
      });
    });
  });
});
/**
 * Simple mock endpoint event that works for tree layouts.
 */
function mockEndpointEvent({
  entityID,
  name,
  parentEntityId,
  timestamp,
}: {
  entityID: string;
  name: string;
  parentEntityId: string;
  timestamp: number;
}): EndpointEvent {
  return {
    '@timestamp': timestamp,
    event: {
      type: 'start',
      category: 'process',
    },
    process: {
      entity_id: entityID,
      name,
      parent: {
        entity_id: parentEntityId,
      },
    },
  } as EndpointEvent;
}

function treeWith2AncestorsAndNoChildren({
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

function treeWithNoAncestorsAnd2Children({
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
