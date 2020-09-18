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
import { ResolverChildNode, ResolverEvent, ResolverTree } from '../../../../common/endpoint/types';
import * as eventModel from '../../../../common/endpoint/models/event';
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
        events: baseTree.allEvents as ResolverEvent[],
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
    let eventStatsForFirstChildNode: { total: number; byCategory: Record<string, number> };
    let categoryToOverCount: string;
    let aggregateCategoryTotalForFirstChildNode: number;
    let tree: ResolverTree;

    /**
     * Compiling stats to use for checking limit warnings and counts of missing events
     * e.g. Limit warnings should show when number of related events actually displayed
     * is lower than the estimated count from stats.
     */

    beforeEach(() => {
      ({
        tree,
        firstChildNodeInTree,
        eventStatsForFirstChildNode,
        categoryToOverCount,
        aggregateCategoryTotalForFirstChildNode,
      } = mockedTree());
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
            events: firstChildNodeInTree.relatedEvents as ResolverEvent[],
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
      it('should indicate the correct related event count for each category', () => {
        const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
        const displayCountsForCategory = selectedRelatedInfo(firstChildNodeInTree.id)
          ?.numberActuallyDisplayedForCategory!;

        const eventCategoriesForNode: string[] = Object.keys(
          eventStatsForFirstChildNode.byCategory
        );

        for (const eventCategory of eventCategoriesForNode) {
          expect(`${eventCategory}:${displayCountsForCategory(eventCategory)}`).toBe(
            `${eventCategory}:${eventStatsForFirstChildNode.byCategory[eventCategory]}`
          );
        }
      });
      /**
       * The general approach reflected here is to _avoid_ showing a limit warning - even if we hit
       * the overall related event limit - as long as the number in our category matches what the stats
       * say we have. E.g. If the stats say you have 20 dns events, and we receive 20 dns events, we
       * don't need to display a limit warning for that, even if we hit some overall event limit of e.g. 100
       * while we were fetching the 20.
       */
      it('should not indicate the limit has been exceeded because the number of related events received for the category is greater or equal to the stats count', () => {
        const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
        const shouldShowLimit = selectedRelatedInfo(firstChildNodeInTree.id)
          ?.shouldShowLimitForCategory!;
        for (const typeCounted of Object.keys(eventStatsForFirstChildNode.byCategory)) {
          expect(shouldShowLimit(typeCounted)).toBe(false);
        }
      });
      it('should not indicate that there are any related events missing because the number of related events received for the category is greater or equal to the stats count', () => {
        const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
        const notDisplayed = selectedRelatedInfo(firstChildNodeInTree.id)
          ?.numberNotDisplayedForCategory!;
        for (const typeCounted of Object.keys(eventStatsForFirstChildNode.byCategory)) {
          expect(notDisplayed(typeCounted)).toBe(0);
        }
      });
      it('should return an overall correct count for the number of related events', () => {
        const aggregateTotalByEntityId = selectors.relatedEventAggregateTotalByEntityId(
          store.getState()
        );
        const countForId = aggregateTotalByEntityId(firstChildNodeInTree.id);
        expect(countForId).toBe(aggregateCategoryTotalForFirstChildNode);
      });
    });
    describe('when data was received and stats show more related events than the API can provide', () => {
      beforeEach(() => {
        // Add 1 to the stats for an event category so that the selectors think we are missing data.
        // This mutates `tree`, and then we re-dispatch it
        eventStatsForFirstChildNode.byCategory[categoryToOverCount] =
          eventStatsForFirstChildNode.byCategory[categoryToOverCount] + 1;

        if (tree) {
          dispatchTree(tree);
          const relatedAction: DataAction = {
            type: 'serverReturnedRelatedEventData',
            payload: {
              entityID: firstChildNodeInTree.id,
              // Casting here because the generator returns the SafeResolverEvent type which isn't yet compatible with
              // a lot of the frontend functions. So casting it back to the unsafe type for now.
              events: firstChildNodeInTree.relatedEvents as ResolverEvent[],
              nextEvent: 'aValidNextEventCursor',
            },
          };
          store.dispatch(relatedAction);
        }
      });
      it('should have the correct related events', () => {
        const selectedEventsByEntityId = selectors.relatedEventsByEntityId(store.getState());
        const selectedEventsForFirstChildNode = selectedEventsByEntityId.get(
          firstChildNodeInTree.id
        )!.events;

        expect(selectedEventsForFirstChildNode).toBe(firstChildNodeInTree.relatedEvents);
      });
      it('should return related events for the category equal to the number of events of that type provided', () => {
        const relatedEventsByCategory = selectors.relatedEventsByCategory(store.getState());
        const relatedEventsForOvercountedCategory = relatedEventsByCategory(
          firstChildNodeInTree.id
        )(categoryToOverCount);
        expect(relatedEventsForOvercountedCategory.length).toBe(
          eventStatsForFirstChildNode.byCategory[categoryToOverCount] - 1
        );
      });
      it('should return the correct related event detail metadata for a given related event', () => {
        const relatedEventsByCategory = selectors.relatedEventsByCategory(store.getState());
        const someRelatedEventForTheFirstChild = relatedEventsByCategory(firstChildNodeInTree.id)(
          categoryToOverCount
        )[0];
        const relatedEventID = eventModel.eventId(someRelatedEventForTheFirstChild)!;
        const relatedDisplayInfo = selectors.relatedEventDisplayInfoByEntityAndSelfID(
          store.getState()
        )(firstChildNodeInTree.id, relatedEventID);
        const [, countOfSameType, , sectionData] = relatedDisplayInfo;
        const hostEntries = sectionData.filter((section) => {
          return section.sectionTitle === 'host';
        })[0].entries;
        expect(hostEntries).toContainEqual({ title: 'os.platform', description: 'Windows' });
        expect(countOfSameType).toBe(
          eventStatsForFirstChildNode.byCategory[categoryToOverCount] - 1
        );
      });
      it('should indicate the limit has been exceeded because the number of related events received for the category is less than what the stats count said it would be', () => {
        const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
        const shouldShowLimit = selectedRelatedInfo(firstChildNodeInTree.id)
          ?.shouldShowLimitForCategory!;
        expect(shouldShowLimit(categoryToOverCount)).toBe(true);
      });
      it('should indicate that there are related events missing because the number of related events received for the category is less than what the stats count said it would be', () => {
        const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
        const notDisplayed = selectedRelatedInfo(firstChildNodeInTree.id)
          ?.numberNotDisplayedForCategory!;
        expect(notDisplayed(categoryToOverCount)).toBe(1);
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
    events: baseTree.allEvents as ResolverEvent[],
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
      childNode.lifecycle = node.lifecycle as ResolverEvent[];

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
    eventStatsForFirstChildNode: statsResults.eventStats,
    aggregateCategoryTotalForFirstChildNode: statsResults.aggregateCategoryTotal,
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
  aggregateCategoryTotal: number;
} {
  const totalRelatedEvents = node.relatedEvents.length;
  // For the purposes of testing, we pick one category to fake an extra event for
  // so we can test if the event limit selectors do the right thing.

  let firstCategory: string | undefined;

  // This is the "aggregate total" which is displayed to users as the total count
  // of related events for the node. It is tallied by incrementing for every discrete
  // event.category in an event.category array (or just 1 for a plain string). E.g. two events
  // categories 'file' and ['dns','network'] would have an `aggregate total` of 3.
  let aggregateCategoryTotal: number = 0;

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
        aggregateCategoryTotal++;
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
    aggregateCategoryTotal,
  };
}
