/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as selectors from './selectors';
import { DataState, TimeRange } from '../../types';
import { ResolverAction } from '../actions';
import { dataReducer } from './reducer';
import { createStore } from 'redux';
import {
  mockTreeWithNoAncestorsAnd2Children,
  mockTreeWith2AncestorsAndNoChildren,
  mockTreeWith1AncestorAnd2ChildrenAndAllNodesHave2GraphableEvents,
  mockTreeWithNoProcessEvents,
} from '../../mocks/resolver_tree';
import { endpointSourceSchema } from '../../mocks/tree_schema';
import * as nodeModel from '../../../../common/endpoint/models/node';
import { mockTreeFetcherParameters } from '../../mocks/tree_fetcher_parameters';
import { SafeResolverEvent } from '../../../../common/endpoint/types';
import { mockEndpointEvent } from '../../mocks/endpoint_event';
import { maxDate } from '../../models/time_range';

function mockNodeDataWithAllProcessesTerminated({
  originID,
  firstAncestorID,
  secondAncestorID,
}: {
  secondAncestorID: string;
  firstAncestorID: string;
  originID: string;
}): SafeResolverEvent[] {
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

  return [
    originEvent,
    originEventTermination,
    firstAncestor,
    firstAncestorTermination,
    secondAncestor,
    secondAncestorTermination,
  ];
}

describe('data state', () => {
  let actions: ResolverAction[];

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

  beforeEach(() => {
    actions = [];
  });

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
            shouldUpdate: false,
            filters: {},
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
        parameters to fetch: {\\"databaseDocumentID\\":\\"databaseDocumentID\\",\\"indices\\":[],\\"filters\\":{}}
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
          payload: { databaseDocumentID, indices: [], filters: {} },
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
        requires a pending request to be aborted: {\\"databaseDocumentID\\":\\"databaseDocumentID\\",\\"indices\\":[],\\"filters\\":{}}"
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
            shouldUpdate: false,
            filters: {},
          },
        },
        {
          type: 'appRequestedResolverData',
          payload: { databaseDocumentID, indices: [], filters: {} },
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
          payload: { databaseDocumentID, indices: [], filters: {} },
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
            shouldUpdate: false,
            filters: {},
          },
        },
        // this happens when the middleware starts the request
        {
          type: 'appRequestedResolverData',
          payload: { databaseDocumentID: firstDatabaseDocumentID, indices: [], filters: {} },
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
            shouldUpdate: false,
            filters: {},
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
        parameters to fetch: {\\"databaseDocumentID\\":\\"second databaseDocumentID\\",\\"indices\\":[],\\"filters\\":{}}
        requires a pending request to be aborted: {\\"databaseDocumentID\\":\\"first databaseDocumentID\\",\\"indices\\":[],\\"filters\\":{}}"
      `);
    });
    describe('and when the old request was aborted', () => {
      beforeEach(() => {
        actions.push({
          type: 'appAbortedResolverDataRequest',
          payload: { databaseDocumentID: firstDatabaseDocumentID, indices: [], filters: {} },
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
          parameters to fetch: {\\"databaseDocumentID\\":\\"second databaseDocumentID\\",\\"indices\\":[],\\"filters\\":{}}
          requires a pending request to be aborted: null"
        `);
      });
      describe('and when the next request starts', () => {
        beforeEach(() => {
          actions.push({
            type: 'appRequestedResolverData',
            payload: { databaseDocumentID: secondDatabaseDocumentID, indices: [], filters: {} },
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
  describe('with a mock tree of no ancestors and two children', () => {
    const databaseDocumentID = 'doc id';
    const resolverComponentInstanceID = 'instance';
    const originID = 'origin';
    const firstChildID = 'first';
    const secondChildID = 'second';
    const { resolverTree } = mockTreeWithNoAncestorsAnd2Children({
      originID,
      firstChildID,
      secondChildID,
    });
    const { schema, dataSource } = endpointSourceSchema();
    describe('when resolver receives external properties without time range filters', () => {
      beforeEach(() => {
        actions = [
          {
            type: 'appReceivedNewExternalProperties',
            payload: {
              databaseDocumentID,
              resolverComponentInstanceID,
              locationSearch: '',
              indices: [],
              shouldUpdate: false,
              filters: {},
            },
          },
          {
            type: 'appRequestedResolverData',
            payload: { databaseDocumentID, indices: [], filters: {} },
          },
          {
            type: 'serverReturnedResolverData',
            payload: {
              result: resolverTree,
              dataSource,
              schema,
              parameters: { databaseDocumentID, indices: [], filters: {} },
            },
          },
        ];
      });
      it('uses the default time range filters', () => {
        expect(selectors.timeRangeFilters(state())?.from).toBe(new Date(0).toISOString());
        expect(selectors.timeRangeFilters(state())?.to).toBe(new Date(maxDate).toISOString());
      });
      describe('when resolver receives time range filters', () => {
        const timeRangeFilters: TimeRange = {
          to: 'to',
          from: 'from',
        };
        beforeEach(() => {
          actions = [
            ...actions,
            {
              type: 'appReceivedNewExternalProperties',
              payload: {
                databaseDocumentID,
                resolverComponentInstanceID,
                locationSearch: '',
                indices: [],
                shouldUpdate: false,
                filters: timeRangeFilters,
              },
            },
            {
              type: 'appRequestedResolverData',
              payload: {
                databaseDocumentID,
                indices: [],
                filters: timeRangeFilters,
              },
            },
            {
              type: 'serverReturnedResolverData',
              payload: {
                result: resolverTree,
                dataSource,
                schema,
                parameters: {
                  databaseDocumentID,
                  indices: [],
                  filters: timeRangeFilters,
                },
              },
            },
          ];
        });
        it('uses the received time range filters', () => {
          expect(selectors.timeRangeFilters(state())?.from).toBe('from');
          expect(selectors.timeRangeFilters(state())?.to).toBe('to');
        });
      });
    });
  });
  describe('with a tree with no descendants and 2 ancestors', () => {
    const originID = 'c';
    const firstAncestorID = 'b';
    const secondAncestorID = 'a';
    beforeEach(() => {
      const { schema, dataSource } = endpointSourceSchema();
      actions = [
        {
          type: 'serverReturnedResolverData',
          payload: {
            result: mockTreeWith2AncestorsAndNoChildren({
              originID,
              firstAncestorID,
              secondAncestorID,
            }),
            dataSource,
            schema,
            // this value doesn't matter
            parameters: mockTreeFetcherParameters(),
          },
        },
      ];
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
    const nodeData = mockNodeDataWithAllProcessesTerminated({
      originID,
      firstAncestorID,
      secondAncestorID,
    });
    beforeEach(() => {
      actions = [
        {
          type: 'serverReturnedNodeData',
          payload: {
            nodeData,
            requestedIDs: new Set([originID, firstAncestorID, secondAncestorID]),
            // mock the requested size being larger than the returned number of events so we
            // avoid the case where the limit was reached
            numberOfRequestedEvents: nodeData.length + 1,
          },
        },
      ];
    });
    it('should have origin as terminated', () => {
      expect(selectors.nodeDataStatus(state())(originID)).toBe('terminated');
    });
    it('should have first ancestor as termianted', () => {
      expect(selectors.nodeDataStatus(state())(firstAncestorID)).toBe('terminated');
    });
    it('should have second ancestor as terminated', () => {
      expect(selectors.nodeDataStatus(state())(secondAncestorID)).toBe('terminated');
    });
  });
  describe('with a tree with 2 children and no ancestors', () => {
    const originID = 'c';
    const firstChildID = 'd';
    const secondChildID = 'e';
    beforeEach(() => {
      const { resolverTree } = mockTreeWithNoAncestorsAnd2Children({
        originID,
        firstChildID,
        secondChildID,
      });
      const { schema, dataSource } = endpointSourceSchema();
      actions = [
        {
          type: 'serverReturnedResolverData',
          payload: {
            result: resolverTree,
            dataSource,
            schema,
            // this value doesn't matter
            parameters: mockTreeFetcherParameters(),
          },
        },
      ];
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
      const { resolverTree } = mockTreeWithNoAncestorsAnd2Children({
        originID,
        firstChildID,
        secondChildID,
      });
      const { schema, dataSource } = endpointSourceSchema();
      actions = [
        {
          type: 'serverReturnedResolverData',
          payload: {
            result: resolverTree,
            dataSource,
            schema,
            // this value doesn't matter
            parameters: mockTreeFetcherParameters(),
          },
        },
      ];
    });
    it('should be able to calculate the aria flowto candidates for all processes nodes', () => {
      const graphables = selectors.graphableNodes(state());
      expect(graphables.length).toBe(3);
      for (const node of graphables) {
        expect(() => {
          selectors.ariaFlowtoCandidate(state())(nodeModel.nodeID(node)!);
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
      const { schema, dataSource } = endpointSourceSchema();
      actions = [
        {
          type: 'serverReturnedResolverData',
          payload: {
            result: tree,
            dataSource,
            schema,
            // this value doesn't matter
            parameters: mockTreeFetcherParameters(),
          },
        },
      ];
    });
    it('should have 4 graphable processes', () => {
      expect(selectors.graphableNodes(state()).length).toBe(4);
    });
  });
  describe('with a tree with no process events', () => {
    beforeEach(() => {
      const { schema, dataSource } = endpointSourceSchema();
      const tree = mockTreeWithNoProcessEvents();
      actions = [
        {
          type: 'serverReturnedResolverData',
          payload: {
            result: tree,
            dataSource,
            schema,
            // this value doesn't matter
            parameters: mockTreeFetcherParameters(),
          },
        },
      ];
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
  describe('when the resolver tree response is complete, still use non-default indices', () => {
    beforeEach(() => {
      const { resolverTree } = mockTreeWithNoAncestorsAnd2Children({
        originID: 'a',
        firstChildID: 'b',
        secondChildID: 'c',
      });
      const { schema, dataSource } = endpointSourceSchema();
      actions = [
        {
          type: 'serverReturnedResolverData',
          payload: {
            result: resolverTree,
            dataSource,
            schema,
            parameters: {
              databaseDocumentID: '',
              indices: ['someNonDefaultIndex'],
              filters: {},
            },
          },
        },
      ];
    });
    it('should have an empty array for tree parameter indices, and a non empty array for event indices', () => {
      const treeParameterIndices = selectors.treeParameterIndices(state());
      expect(treeParameterIndices.length).toBe(0);
      const eventIndices = selectors.eventIndices(state());
      expect(eventIndices.length).toBe(1);
    });
  });
  describe('when the resolver tree response is pending use the same indices the user is currently looking at data from', () => {
    beforeEach(() => {
      const { resolverTree } = mockTreeWithNoAncestorsAnd2Children({
        originID: 'a',
        firstChildID: 'b',
        secondChildID: 'c',
      });
      const { schema, dataSource } = endpointSourceSchema();
      actions = [
        {
          type: 'serverReturnedResolverData',
          payload: {
            result: resolverTree,
            dataSource,
            schema,
            parameters: {
              databaseDocumentID: '',
              indices: ['defaultIndex'],
              filters: {},
            },
          },
        },
        {
          type: 'appReceivedNewExternalProperties',
          payload: {
            databaseDocumentID: '',
            resolverComponentInstanceID: '',
            locationSearch: '',
            indices: ['someNonDefaultIndex', 'someOtherIndex'],
            shouldUpdate: false,
            filters: {},
          },
        },
        {
          type: 'appRequestedResolverData',
          payload: {
            databaseDocumentID: '',
            indices: ['someNonDefaultIndex', 'someOtherIndex'],
            filters: {},
          },
        },
      ];
    });
    it('should have an empty array for tree parameter indices, and the same set of indices as the last tree response', () => {
      const treeParameterIndices = selectors.treeParameterIndices(state());
      expect(treeParameterIndices.length).toBe(0);
      const eventIndices = selectors.eventIndices(state());
      expect(eventIndices.length).toBe(1);
    });
  });
});
