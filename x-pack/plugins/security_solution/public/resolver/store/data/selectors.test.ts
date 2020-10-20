/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as selectors from './selectors';
import { DataState } from '../../types';
import { ResolverAction } from '../actions';
import { dataReducer } from './reducer';
import { createStore } from 'redux';
import {
  mockTreeWithNoAncestorsAnd2Children,
  mockTreeWith2AncestorsAndNoChildren,
  mockTreeWith1AncestorAnd2ChildrenAndAllNodesHave2GraphableEvents,
  mockTreeWithAllProcessesTerminated,
  mockTreeWithNoProcessEvents,
} from '../../mocks/resolver_tree';
import * as eventModel from '../../../../common/endpoint/models/event';
import { EndpointEvent } from '../../../../common/endpoint/types';
import { mockTreeFetcherParameters } from '../../mocks/tree_fetcher_parameters';

describe('data state', () => {
  let actions: ResolverAction[] = [];

  /**
   * Get state, given an ordered collection of actions.
   */
  const state: () => DataState = () => {
    const store = createStore(dataReducer);
    for (const action of actions) {
      store.dispatch(action);
    }
    return store.getState();
  };

  /**
   * This prints out all of the properties of the data state.
   * This way we can see the overall behavior of the selector easily.
   */
  const viewAsAString = (dataState: DataState) => {
    return [
      ['is loading', selectors.isTreeLoading(dataState)],
      ['has an error', selectors.hadErrorLoadingTree(dataState)],
      ['has more children', selectors.hasMoreChildren(dataState)],
      ['has more ancestors', selectors.hasMoreAncestors(dataState)],
      ['parameters to fetch', selectors.treeParametersToFetch(dataState)],
      [
        'requires a pending request to be aborted',
        selectors.treeRequestParametersToAbort(dataState),
      ],
    ]
      .map(([message, value]) => `${message}: ${JSON.stringify(value)}`)
      .join('\n');
  };

  it(`shouldn't initially be loading, or have an error, or have more children or ancestors, or have a request to make, or have a pending request that needs to be aborted.`, () => {
    expect(viewAsAString(state())).toMatchInlineSnapshot(`
      "is loading: false
      has an error: false
      has more children: false
      has more ancestors: false
      parameters to fetch: null
      requires a pending request to be aborted: null"
    `);
  });

  describe('when there are parameters to fetch but no pending request', () => {
    const databaseDocumentID = 'databaseDocumentID';
    const resolverComponentInstanceID = 'resolverComponentInstanceID';
    beforeEach(() => {
      actions = [
        {
          type: 'appReceivedNewExternalProperties',
          payload: {
            databaseDocumentID,
            resolverComponentInstanceID,

            // `locationSearch` doesn't matter for this test
            locationSearch: '',
            indices: [],
          },
        },
      ];
    });
    it('should need to request the tree', () => {
      expect(selectors.treeParametersToFetch(state())?.databaseDocumentID).toBe(databaseDocumentID);
    });
    it('should not be loading, have an error, have more children or ancestors, or have a pending request that needs to be aborted.', () => {
      expect(viewAsAString(state())).toMatchInlineSnapshot(`
        "is loading: false
        has an error: false
        has more children: false
        has more ancestors: false
        parameters to fetch: {\\"databaseDocumentID\\":\\"databaseDocumentID\\",\\"indices\\":[]}
        requires a pending request to be aborted: null"
      `);
    });
  });
  describe('when there is a pending request but no current tree fetching parameters', () => {
    const databaseDocumentID = 'databaseDocumentID';
    beforeEach(() => {
      actions = [
        {
          type: 'appRequestedResolverData',
          payload: { databaseDocumentID, indices: [] },
        },
      ];
    });
    it('should be loading', () => {
      expect(selectors.isTreeLoading(state())).toBe(true);
    });
    it('should have a request to abort', () => {
      expect(selectors.treeRequestParametersToAbort(state())?.databaseDocumentID).toBe(
        databaseDocumentID
      );
    });
    it('should not have an error, more children, more ancestors, or request to make.', () => {
      expect(viewAsAString(state())).toMatchInlineSnapshot(`
        "is loading: true
        has an error: false
        has more children: false
        has more ancestors: false
        parameters to fetch: null
        requires a pending request to be aborted: {\\"databaseDocumentID\\":\\"databaseDocumentID\\",\\"indices\\":[]}"
      `);
    });
  });
  describe('when there is a pending request that was made using the current parameters', () => {
    const databaseDocumentID = 'databaseDocumentID';
    const resolverComponentInstanceID = 'resolverComponentInstanceID';
    beforeEach(() => {
      actions = [
        {
          type: 'appReceivedNewExternalProperties',
          payload: {
            databaseDocumentID,
            resolverComponentInstanceID,

            // `locationSearch` doesn't matter for this test
            locationSearch: '',
            indices: [],
          },
        },
        {
          type: 'appRequestedResolverData',
          payload: { databaseDocumentID, indices: [] },
        },
      ];
    });
    it('should be loading', () => {
      expect(selectors.isTreeLoading(state())).toBe(true);
    });
    it('should not have a request to abort', () => {
      expect(selectors.treeRequestParametersToAbort(state())).toBe(null);
    });
    it('should not have an error, more children, more ancestors, a request to make, or a pending request that should be aborted.', () => {
      expect(viewAsAString(state())).toMatchInlineSnapshot(`
        "is loading: true
        has an error: false
        has more children: false
        has more ancestors: false
        parameters to fetch: null
        requires a pending request to be aborted: null"
      `);
    });
    describe('when the pending request fails', () => {
      beforeEach(() => {
        actions.push({
          type: 'serverFailedToReturnResolverData',
          payload: { databaseDocumentID, indices: [] },
        });
      });
      it('should not be loading', () => {
        expect(selectors.isTreeLoading(state())).toBe(false);
      });
      it('should have an error', () => {
        expect(selectors.hadErrorLoadingTree(state())).toBe(true);
      });
      it('should not be loading, have more children, have more ancestors, have a request to make, or have a pending request that needs to be aborted.', () => {
        expect(viewAsAString(state())).toMatchInlineSnapshot(`
          "is loading: false
          has an error: true
          has more children: false
          has more ancestors: false
          parameters to fetch: null
          requires a pending request to be aborted: null"
        `);
      });
    });
  });
  describe('when there is a pending request that was made with parameters that are different than the current tree fetching parameters', () => {
    const firstDatabaseDocumentID = 'first databaseDocumentID';
    const secondDatabaseDocumentID = 'second databaseDocumentID';
    const resolverComponentInstanceID1 = 'resolverComponentInstanceID1';
    const resolverComponentInstanceID2 = 'resolverComponentInstanceID2';
    beforeEach(() => {
      actions = [
        // receive the document ID, this would cause the middleware to starts the request
        {
          type: 'appReceivedNewExternalProperties',
          payload: {
            databaseDocumentID: firstDatabaseDocumentID,
            resolverComponentInstanceID: resolverComponentInstanceID1,
            // `locationSearch` doesn't matter for this test
            locationSearch: '',
            indices: [],
          },
        },
        // this happens when the middleware starts the request
        {
          type: 'appRequestedResolverData',
          payload: { databaseDocumentID: firstDatabaseDocumentID, indices: [] },
        },
        // receive a different databaseDocumentID. this should cause the middleware to abort the existing request and start a new one
        {
          type: 'appReceivedNewExternalProperties',
          payload: {
            databaseDocumentID: secondDatabaseDocumentID,
            resolverComponentInstanceID: resolverComponentInstanceID2,
            // `locationSearch` doesn't matter for this test
            locationSearch: '',
            indices: [],
          },
        },
      ];
    });
    it('should be loading', () => {
      expect(selectors.isTreeLoading(state())).toBe(true);
    });
    it('should need to request the tree using the second set of parameters', () => {
      expect(selectors.treeParametersToFetch(state())?.databaseDocumentID).toBe(
        secondDatabaseDocumentID
      );
    });
    it('should need to abort the request for the databaseDocumentID', () => {
      expect(selectors.treeParametersToFetch(state())?.databaseDocumentID).toBe(
        secondDatabaseDocumentID
      );
    });
    it('should use the correct location for the second resolver', () => {
      expect(selectors.resolverComponentInstanceID(state())).toBe(resolverComponentInstanceID2);
    });
    it('should not have an error, more children, or more ancestors.', () => {
      expect(viewAsAString(state())).toMatchInlineSnapshot(`
        "is loading: true
        has an error: false
        has more children: false
        has more ancestors: false
        parameters to fetch: {\\"databaseDocumentID\\":\\"second databaseDocumentID\\",\\"indices\\":[]}
        requires a pending request to be aborted: {\\"databaseDocumentID\\":\\"first databaseDocumentID\\",\\"indices\\":[]}"
      `);
    });
    describe('and when the old request was aborted', () => {
      beforeEach(() => {
        actions.push({
          type: 'appAbortedResolverDataRequest',
          payload: { databaseDocumentID: firstDatabaseDocumentID, indices: [] },
        });
      });
      it('should not require a pending request to be aborted', () => {
        expect(selectors.treeRequestParametersToAbort(state())).toBe(null);
      });
      it('should have a document to fetch', () => {
        expect(selectors.treeParametersToFetch(state())?.databaseDocumentID).toBe(
          secondDatabaseDocumentID
        );
      });
      it('should not be loading', () => {
        expect(selectors.isTreeLoading(state())).toBe(false);
      });
      it('should not have an error, more children, or more ancestors.', () => {
        expect(viewAsAString(state())).toMatchInlineSnapshot(`
          "is loading: false
          has an error: false
          has more children: false
          has more ancestors: false
          parameters to fetch: {\\"databaseDocumentID\\":\\"second databaseDocumentID\\",\\"indices\\":[]}
          requires a pending request to be aborted: null"
        `);
      });
      describe('and when the next request starts', () => {
        beforeEach(() => {
          actions.push({
            type: 'appRequestedResolverData',
            payload: { databaseDocumentID: secondDatabaseDocumentID, indices: [] },
          });
        });
        it('should not have a document ID to fetch', () => {
          expect(selectors.treeParametersToFetch(state())).toBe(null);
        });
        it('should be loading', () => {
          expect(selectors.isTreeLoading(state())).toBe(true);
        });
        it('should not have an error, more children, more ancestors, or a pending request that needs to be aborted.', () => {
          expect(viewAsAString(state())).toMatchInlineSnapshot(`
            "is loading: true
            has an error: false
            has more children: false
            has more ancestors: false
            parameters to fetch: null
            requires a pending request to be aborted: null"
          `);
        });
      });
    });
  });
  describe('with a tree with no descendants and 2 ancestors', () => {
    const originID = 'c';
    const firstAncestorID = 'b';
    const secondAncestorID = 'a';
    beforeEach(() => {
      actions.push({
        type: 'serverReturnedResolverData',
        payload: {
          result: mockTreeWith2AncestorsAndNoChildren({
            originID,
            firstAncestorID,
            secondAncestorID,
          }),
          // this value doesn't matter
          parameters: mockTreeFetcherParameters(),
        },
      });
    });
    it('should have no flowto candidate for the origin', () => {
      expect(selectors.ariaFlowtoCandidate(state())(originID)).toBe(null);
    });
    it('should have no flowto candidate for the first ancestor', () => {
      expect(selectors.ariaFlowtoCandidate(state())(firstAncestorID)).toBe(null);
    });
    it('should have no flowto candidate for the second ancestor ancestor', () => {
      expect(selectors.ariaFlowtoCandidate(state())(secondAncestorID)).toBe(null);
    });
  });
  describe('with a tree with all processes terminated', () => {
    const originID = 'c';
    const firstAncestorID = 'b';
    const secondAncestorID = 'a';
    beforeEach(() => {
      actions.push({
        type: 'serverReturnedResolverData',
        payload: {
          result: mockTreeWithAllProcessesTerminated({
            originID,
            firstAncestorID,
            secondAncestorID,
          }),
          // this value doesn't matter
          parameters: mockTreeFetcherParameters(),
        },
      });
    });
    it('should have origin as terminated', () => {
      expect(selectors.isProcessTerminated(state())(originID)).toBe(true);
    });
    it('should have first ancestor as termianted', () => {
      expect(selectors.isProcessTerminated(state())(firstAncestorID)).toBe(true);
    });
    it('should have second ancestor as terminated', () => {
      expect(selectors.isProcessTerminated(state())(secondAncestorID)).toBe(true);
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
          result: mockTreeWithNoAncestorsAnd2Children({ originID, firstChildID, secondChildID }),
          // this value doesn't matter
          parameters: mockTreeFetcherParameters(),
        },
      });
    });
    it('should have no flowto candidate for the origin', () => {
      expect(selectors.ariaFlowtoCandidate(state())(originID)).toBe(null);
    });
    it('should use the second child as the flowto candidate for the first child', () => {
      expect(selectors.ariaFlowtoCandidate(state())(firstChildID)).toBe(secondChildID);
    });
    it('should have no flowto candidate for the second child', () => {
      expect(selectors.ariaFlowtoCandidate(state())(secondChildID)).toBe(null);
    });
  });
  describe('with a tree where the root process has no parent info at all', () => {
    const originID = 'c';
    const firstChildID = 'd';
    const secondChildID = 'e';
    beforeEach(() => {
      const tree = mockTreeWithNoAncestorsAnd2Children({ originID, firstChildID, secondChildID });
      for (const event of tree.lifecycle) {
        // delete the process.parent key, if present
        // cast as `EndpointEvent` because `ResolverEvent` can also be `LegacyEndpointEvent` which has no `process` field
        delete (event as EndpointEvent).process?.parent;
      }

      actions.push({
        type: 'serverReturnedResolverData',
        payload: {
          result: tree,
          // this value doesn't matter
          parameters: mockTreeFetcherParameters(),
        },
      });
    });
    it('should be able to calculate the aria flowto candidates for all processes nodes', () => {
      const graphables = selectors.graphableProcesses(state());
      expect(graphables.length).toBe(3);
      for (const event of graphables) {
        expect(() => {
          selectors.ariaFlowtoCandidate(state())(eventModel.entityIDSafeVersion(event)!);
        }).not.toThrow();
      }
    });
  });
  describe('with a tree with 1 ancestor and 2 children, where all nodes have 2 graphable events', () => {
    const ancestorID = 'b';
    const originID = 'c';
    const firstChildID = 'd';
    const secondChildID = 'e';
    beforeEach(() => {
      const tree = mockTreeWith1AncestorAnd2ChildrenAndAllNodesHave2GraphableEvents({
        ancestorID,
        originID,
        firstChildID,
        secondChildID,
      });
      actions.push({
        type: 'serverReturnedResolverData',
        payload: {
          result: tree,
          // this value doesn't matter
          parameters: mockTreeFetcherParameters(),
        },
      });
    });
    it('should have 4 graphable processes', () => {
      expect(selectors.graphableProcesses(state()).length).toBe(4);
    });
  });
  describe('with a tree with no process events', () => {
    beforeEach(() => {
      const tree = mockTreeWithNoProcessEvents();
      actions.push({
        type: 'serverReturnedResolverData',
        payload: {
          result: tree,
          // this value doesn't matter
          parameters: mockTreeFetcherParameters(),
        },
      });
    });
    it('should return an empty layout', () => {
      expect(selectors.layout(state())).toMatchInlineSnapshot(`
        Object {
          "ariaLevels": Map {},
          "edgeLineSegments": Array [],
          "processNodePositions": Map {},
        }
      `);
    });
  });
});
