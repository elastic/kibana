/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createStore, Store } from 'redux';
import { RelatedEventCategory, TreeNode } from '../../../../common/endpoint/generate_data';
import { dataReducer } from './reducer';
import * as selectors from './selectors';
import { DataState } from '../../types';
import { DataAction } from './action';
import { usingGenerator, Metadata } from '../../data_access_layer/mocks/using_generator';
import { NewResolverTree } from '../../../../common/endpoint/types';

/**
 * Test the data reducer and selector.
 */
describe('Resolver Data Middleware', () => {
  let store: Store<DataState, DataAction>;
  let dispatchTree: (
    tree: NewResolverTree,
    requestedAncestors: number,
    requestedDescendants: number
  ) => void;

  beforeEach(() => {
    store = createStore(dataReducer, undefined);
    dispatchTree = (
      tree: NewResolverTree,
      requestedAncestors: number,
      requestedDescendants: number
    ) => {
      const action: DataAction = {
        type: 'serverReturnedResolverData',
        payload: {
          result: tree,
          parameters: {
            databaseDocumentID: '',
            indices: [],
            // +1 to include the origin
            requestedAncestors,
            requestedDescendants,
          },
        },
      };
      store.dispatch(action);
    };
  });

  describe("when data the server's ancestry and descendants limits were reached", () => {
    beforeEach(() => {
      const { metadata } = usingGenerator({
        ancestors: 5,
        generations: 1,
        children: 5,
      });
      dispatchTree(
        metadata.structuredTree,
        metadata.tree.ancestry.size,
        metadata.tree.children.size
      );
    });
    it('should indicate there are additional ancestor', () => {
      expect(selectors.hasMoreAncestors(store.getState())).toBe(true);
    });
    it('should indicate there are additional children', () => {
      expect(selectors.hasMoreChildren(store.getState())).toBe(true);
    });
  });

  describe("when data the server's ancestry and descendants limits were not reached", () => {
    beforeEach(() => {
      const { metadata } = usingGenerator({
        ancestors: 5,
        generations: 1,
        children: 5,
      });

      dispatchTree(
        metadata.structuredTree,
        // +100 means we requested more than the number of ancestors and descendants that were returned
        metadata.tree.ancestry.size + 100,
        metadata.tree.children.size + 100
      );
    });
    it('should indicate there are additional ancestor', () => {
      expect(selectors.hasMoreAncestors(store.getState())).toBe(false);
    });
    it('should indicate there are additional children', () => {
      expect(selectors.hasMoreChildren(store.getState())).toBe(false);
    });
  });

  describe('when data was received for a resolver tree', () => {
    let metadata: Metadata;
    beforeEach(() => {
      ({ metadata } = usingGenerator({
        generations: 1,
        children: 1,
        percentWithRelated: 100,
        relatedEvents: [
          {
            count: 5,
            category: RelatedEventCategory.Driver,
          },
        ],
      }));
      dispatchTree(metadata.structuredTree, 0, 0);
    });
    it('should have the correct total related events for a child node', () => {
      // get the first level of children, and there should only be a single child
      const childNode = Array.from(metadata.tree.childrenLevels[0].values())[0];
      const total = selectors.relatedEventTotalCount(store.getState())(childNode.id);
      expect(total).toEqual(5);
    });
    it('should have the correct related events stats for a child node', () => {
      // get the first level of children, and there should only be a single child
      const childNode = Array.from(metadata.tree.childrenLevels[0].values())[0];
      const stats = selectors.nodeStats(store.getState())(childNode.id);
      expect(stats).toEqual({
        total: 5,
        byCategory: {
          driver: 5,
        },
      });
    });
  });
});
