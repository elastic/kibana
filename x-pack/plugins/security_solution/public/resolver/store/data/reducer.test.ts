/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createStore, Store } from 'redux';
import { EndpointDocGenerator, TreeNode } from '../../../../common/endpoint/generate_data';
import { mock as mockResolverTree } from '../../models/resolver_tree';
import { dataReducer } from './reducer';
import * as selectors from './selectors';
import { DataState } from '../../types';
import { DataAction } from './action';
import { ResolverChildNode, ResolverTree } from '../../../../common/endpoint/types';
import { values } from '../../../../common/endpoint/models/ecs_safety_helpers';
import { mockTreeFetcherParameters } from '../../mocks/tree_fetcher_parameters';

/**
 * Test the data reducer and selector.
 */
describe('Resolver Data Middleware', () => {
  let store: Store<DataState, DataAction>;
  let dispatchTree: (tree: ResolverTree) => void;

  beforeEach(() => {
    store = createStore(dataReducer, undefined);
    dispatchTree = (tree) => {
      const action: DataAction = {
        type: 'serverReturnedResolverData',
        payload: {
          result: tree,
          parameters: mockTreeFetcherParameters(),
        },
      };
      store.dispatch(action);
    };
  });

  describe('when data was received and the ancestry and children edges had cursors', () => {
    beforeEach(() => {
      // Generate a 'tree' using the Resolver generator code. This structure isn't the same as what the API returns.
      const baseTree = generateBaseTree();
      const tree = mockResolverTree({
        // Casting here because the generator returns the SafeResolverEvent type which isn't yet compatible with
        // a lot of the frontend functions. So casting it back to the unsafe type for now.
        events: baseTree.allEvents,
        cursors: {
          childrenNextChild: 'aValidChildCursor',
          ancestryNextAncestor: 'aValidAncestorCursor',
        },
      })!;
      dispatchTree(tree);
    });
    it('should indicate there are additional ancestor', () => {
      expect(selectors.hasMoreAncestors(store.getState())).toBe(true);
    });
    it('should indicate there are additional children', () => {
      expect(selectors.hasMoreChildren(store.getState())).toBe(true);
    });
  });

  describe('when data was received with stats mocked for the first child node', () => {
    let firstChildNodeInTree: TreeNode;
    let tree: ResolverTree;

    /**
     * Compiling stats to use for checking limit warnings and counts of missing events
     * e.g. Limit warnings should show when number of related events actually displayed
     * is lower than the estimated count from stats.
     */

    beforeEach(() => {
      ({ tree, firstChildNodeInTree } = mockedTree());
      if (tree) {
        dispatchTree(tree);
      }
    });

    describe('and when related events were returned with totals equalling what stat counts indicate they should be', () => {
      beforeEach(() => {
        // Return related events for the first child node
        const relatedAction: DataAction = {
          type: 'serverReturnedRelatedEventData',
          payload: {
            entityID: firstChildNodeInTree.id,
            // Casting here because the generator returns the SafeResolverEvent type which isn't yet compatible with
            // a lot of the frontend functions. So casting it back to the unsafe type for now.
            events: firstChildNodeInTree.relatedEvents,
            nextEvent: null,
          },
        };
        store.dispatch(relatedAction);
      });
      it('should have the correct related events', () => {
        const selectedEventsByEntityId = selectors.relatedEventsByEntityId(store.getState());
        const selectedEventsForFirstChildNode = selectedEventsByEntityId.get(
          firstChildNodeInTree.id
        )!.events;

        expect(selectedEventsForFirstChildNode).toBe(firstChildNodeInTree.relatedEvents);
      });
    });
  });
});

function mockedTree() {
  // Generate a 'tree' using the Resolver generator code. This structure isn't the same as what the API returns.
  const baseTree = generateBaseTree();

  const { children } = baseTree;
  const firstChildNodeInTree = [...children.values()][0];

  // The `generateBaseTree` mock doesn't calculate stats (the actual data has them.)
  // So calculate some stats for just the node that we'll test.
  const statsResults = compileStatsForChild(firstChildNodeInTree);

  const tree = mockResolverTree({
    // Casting here because the generator returns the SafeResolverEvent type which isn't yet compatible with
    // a lot of the frontend functions. So casting it back to the unsafe type for now.
    events: baseTree.allEvents,
    /**
     * Calculate children from the ResolverTree response using the children of the `Tree` we generated using the Resolver data generator code.
     * Compile (and attach) stats to the first child node.
     *
     * The purpose of `children` here is to set the `actual`
     * value that the stats values will be compared with
     * to derive things like the number of missing events and if
     * related event limits should be shown.
     */
    children: [...baseTree.children.values()].map((node: TreeNode) => {
      const childNode: Partial<ResolverChildNode> = {};
      // Casting here because the generator returns the SafeResolverEvent type which isn't yet compatible with
      // a lot of the frontend functions. So casting it back to the unsafe type for now.
      childNode.lifecycle = node.lifecycle;

      // `TreeNode` has `id` which is the same as `entityID`.
      // The `ResolverChildNode` calls the entityID as `entityID`.
      // Set `entityID` on `childNode` since the code in test relies on it.
      childNode.entityID = node.id;

      // This should only be true for the first child.
      if (node.id === firstChildNodeInTree.id) {
        // attach stats
        childNode.stats = {
          events: statsResults.eventStats,
          totalAlerts: 0,
        };
      }
      return childNode;
    }) as ResolverChildNode[] /**
          Cast to ResolverChildNode[] array is needed because incoming
          TreeNodes from the generator cannot be assigned cleanly to the
          tree model's expected ResolverChildNode type.
        */,
  });

  return {
    tree: tree!,
    firstChildNodeInTree,
    categoryToOverCount: statsResults.firstCategory,
  };
}

function generateBaseTree() {
  const generator = new EndpointDocGenerator('seed');
  return generator.generateTree({
    ancestors: 1,
    generations: 2,
    children: 3,
    percentWithRelated: 100,
    alwaysGenMaxChildrenPerNode: true,
  });
}

function compileStatsForChild(
  node: TreeNode
): {
  eventStats: {
    /** The total number of related events. */
    total: number;
    /** A record with the categories of events as keys, and the count of events per category as values.  */
    byCategory: Record<string, number>;
  };
  /** The category of the first event.  */
  firstCategory: string;
} {
  const totalRelatedEvents = node.relatedEvents.length;
  // For the purposes of testing, we pick one category to fake an extra event for
  // so we can test if the event limit selectors do the right thing.

  let firstCategory: string | undefined;

  const compiledStats = node.relatedEvents.reduce(
    (counts: Record<string, number>, relatedEvent) => {
      // get an array of categories regardless of whether category is a string or string[]
      const categories: string[] = values(relatedEvent.event?.category);

      for (const category of categories) {
        // Set the first category as 'categoryToOverCount'
        if (firstCategory === undefined) {
          firstCategory = category;
        }

        // Increment the count of events with this category
        counts[category] = counts[category] ? counts[category] + 1 : 1;
      }
      return counts;
    },
    {}
  );
  if (firstCategory === undefined) {
    throw new Error('there were no related events for the node.');
  }
  return {
    /**
     * Object to use for the first child nodes stats `events` object?
     */
    eventStats: {
      total: totalRelatedEvents,
      byCategory: compiledStats,
    },
    firstCategory,
  };
}
