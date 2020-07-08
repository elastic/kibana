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
import { ResolverChildNode } from '../../../../common/endpoint/types';

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

function compileStatsForChild(node: TreeNode) {
  let totalRelatedEvents = 0;
  let categoryToOverCount: string = '';
  const compiledStats = node.relatedEvents.reduce(
    (counts: Record<string, number>, relatedEvent) => {
      totalRelatedEvents++;
      for (const category of [relatedEvent.event.category].flat()) {
        if (!categoryToOverCount) {
          categoryToOverCount = category;
        }
        counts[category] = counts[category] ? counts[category] + 1 : 1;
      }
      return counts;
    },
    {}
  );
  return {
    totalRelatedEvents,
    categoryToOverCount,
    compiledStats,
  };
}

/**
 * Test the data reducer and selector.
 */
describe('Resolver Data Middleware', () => {
  let store: Store<DataState, DataAction>;

  beforeEach(() => {
    store = createStore(dataReducer, undefined);
  });

  describe('when data was received and the ancestry and children edges had cursors', () => {
    let firstChildNodeInTree: TreeNode;
    /**
     * Compiling stats to use for checking limit warnings and counts of missing events
     * e.g. Limit warnings should show when number of related events actually displayed
     * is lower than the estimated count from stats.
     */
    let statsForFirstChild: Record<string, number>;
    beforeEach(() => {
      const baseTree = generateBaseTree();
      const { children } = baseTree;
      firstChildNodeInTree = [...children.values()][0];
      const statsResults = compileStatsForChild(firstChildNodeInTree);
      statsForFirstChild = statsResults.compiledStats;
      const tree = mockResolverTree({
        events: baseTree.allEvents,
        cursors: {
          childrenNextChild: 'aValidChildCursor',
          ancestryNextAncestor: 'aValidAncestorCursor',
        },
        children: [...baseTree.children.values()].map((node) => {
          /**
           * The purpose of `children` here is to set the `actual`
           * value that the stats values will be compared with
           * to derive things like the number of missing events and if
           * related event limits should be shown.
           */
          const childNode: Partial<ResolverChildNode> = node;
          childNode.entityID = node.id;
          if (node.id === firstChildNodeInTree.id) {
            // attach stats
            childNode.stats = {
              events: { total: statsResults.totalRelatedEvents, byCategory: statsForFirstChild },
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
      if (tree) {
        const action: DataAction = {
          type: 'serverReturnedResolverData',
          payload: {
            result: tree,
            databaseDocumentID: '',
          },
        };
        store.dispatch(action);
      }
    });
    it('should indicate there are additional ancestor', () => {
      expect(selectors.hasMoreAncestors(store.getState())).toBe(true);
    });
    it('should indicate there are additional children', () => {
      expect(selectors.hasMoreChildren(store.getState())).toBe(true);
    });

    describe('and when related events were returned with totals equalling what stat counts indicate they should be', () => {
      beforeEach(() => {
        const relatedAction: DataAction = {
          type: 'serverReturnedRelatedEventData',
          payload: {
            entityID: firstChildNodeInTree.id,
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
      it('should indicate the correct related event count for each category', () => {
        const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
        const displayCountsForCategory = selectedRelatedInfo.get(firstChildNodeInTree.id)
          ?.numberActuallyDisplayedForCategory!;
        for (const typeCounted of Object.keys(statsForFirstChild)) {
          expect(`${typeCounted}:${displayCountsForCategory(typeCounted)}`).toBe(
            `${typeCounted}:${statsForFirstChild[typeCounted]}`
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
        const shouldShowLimit = selectedRelatedInfo.get(firstChildNodeInTree.id)
          ?.shouldShowLimitForCategory!;
        for (const typeCounted of Object.keys(statsForFirstChild)) {
          expect(shouldShowLimit(typeCounted)).toBe(false);
        }
      });
      it('should not indicate that there are any related events missing because the number of related events received for the category is greater or equal to the stats count', () => {
        const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
        const notDisplayed = selectedRelatedInfo.get(firstChildNodeInTree.id)
          ?.numberNotDisplayedForCategory!;
        for (const typeCounted of Object.keys(statsForFirstChild)) {
          expect(notDisplayed(typeCounted)).toBe(0);
        }
      });
    });
  });

  describe('when data was received and stats show more related than the API can provide', () => {
    let firstChildNodeInTree: TreeNode;
    /**
     * Compiling stats to use for checking limit warnings and counts of missing events
     * e.g. Limit warnings should show when number of related events actually displayed
     * is lower than the estimated count from stats.
     */
    let statsForFirstChild: Record<string, number>;
    let categoryToOverCount: string;
    beforeEach(() => {
      const baseTree = generateBaseTree();
      const { children } = baseTree;
      firstChildNodeInTree = [...children.values()][0];
      const totalRelatedEvents = 0;
      const statsResults = compileStatsForChild(firstChildNodeInTree);
      statsForFirstChild = statsResults.compiledStats;
      categoryToOverCount = statsResults.categoryToOverCount;
      statsForFirstChild[categoryToOverCount] = statsForFirstChild[categoryToOverCount] + 1;

      const tree = mockResolverTree({
        events: baseTree.allEvents,
        cursors: {
          childrenNextChild: 'aValidChildCursor',
          ancestryNextAncestor: 'aValidAncestorCursor',
        },
        children: [...baseTree.children.values()].map((node) => {
          /**
           * The purpose of `children` here is to set the `actual`
           * value that the stats values will be compared with
           * to derive things like the number of missing events and if
           * related event limits should be shown.
           */
          const childNode: Partial<ResolverChildNode> = node;
          childNode.entityID = node.id;
          if (node.id === firstChildNodeInTree.id) {
            // attach stats
            childNode.stats = {
              events: { total: totalRelatedEvents, byCategory: statsForFirstChild },
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
      if (tree) {
        const action: DataAction = {
          type: 'serverReturnedResolverData',
          payload: {
            result: tree,
            databaseDocumentID: '',
          },
        };
        store.dispatch(action);
        const relatedAction: DataAction = {
          type: 'serverReturnedRelatedEventData',
          payload: {
            entityID: firstChildNodeInTree.id,
            events: firstChildNodeInTree.relatedEvents,
            nextEvent: 'aValidNextEventCursor',
          },
        };
        store.dispatch(relatedAction);
      }
    });
    it('should have the correct related events', () => {
      const selectedEventsByEntityId = selectors.relatedEventsByEntityId(store.getState());
      const selectedEventsForFirstChildNode = selectedEventsByEntityId.get(firstChildNodeInTree.id)!
        .events;

      expect(selectedEventsForFirstChildNode).toBe(firstChildNodeInTree.relatedEvents);
    });
    it('should indicate the limit has been exceeded because the number of related events received for the category is less than what the stats count said it would be', () => {
      const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
      const shouldShowLimit = selectedRelatedInfo.get(firstChildNodeInTree.id)
        ?.shouldShowLimitForCategory!;
      expect(shouldShowLimit(categoryToOverCount)).toBe(true);
    });
    it('should indicate that there are related events missing because the number of related events received for the category is less than what the stats count said it would be', () => {
      const selectedRelatedInfo = selectors.relatedEventInfoByEntityId(store.getState());
      const notDisplayed = selectedRelatedInfo.get(firstChildNodeInTree.id)
        ?.numberNotDisplayedForCategory!;
      expect(notDisplayed(categoryToOverCount)).toBe(1);
    });
  });
});
