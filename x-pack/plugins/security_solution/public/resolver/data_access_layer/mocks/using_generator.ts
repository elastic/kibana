/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointDocGenerator, Tree, TreeNode } from '../../../../common/endpoint/generate_data';
import { DataAccessLayer, Timerange } from '../../types';
import { mock as mockResolverTree } from '../../models/resolver_tree';

import {
  mockTreeWithNoProcessEvents,
  mockTreeWithOneNodeAndTwoPagesOfRelatedEvents,
} from '../../mocks/resolver_tree';
import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
  SafeResolverEvent,
  ResolverChildNode,
} from '../../../../common/endpoint/types';
import * as eventModel from '../../../../common/endpoint/models/event';

interface Metadata {
  /**
   * The `_id` of the document being analyzed.
   */
  databaseDocumentID: string;
  tree: Tree;
  /**
   * A record of entityIDs to be used in tests assertions.
   */
  entityIDs: {
    /**
     * The entityID of the node related to the document being analyzed.
     */
    origin: 'origin';
  };
}

export function mock({
  events,
  cursors = { childrenNextChild: null, ancestryNextAncestor: null },
  children = [],
}: {
  /**
   * Events represented by the ResolverTree.
   */
  events: SafeResolverEvent[];
  children?: ResolverChildNode[];
  /**
   * Optionally provide cursors for the 'children' and 'ancestry' edges.
   */
  cursors?: { childrenNextChild: string | null; ancestryNextAncestor: string | null };
}): ResolverTree | null {
  if (events.length === 0) {
    return null;
  }
  const first = events[0];
  const entityID = eventModel.entityIDSafeVersion(first);
  if (!entityID) {
    throw new Error('first mock event must include an entityID.');
  }
  return {
    entityID,
    // Required
    children: {
      childNodes: children,
      nextChild: cursors.childrenNextChild,
    },
    // Required
    relatedEvents: {
      events: [],
      nextEvent: null,
    },
    // Required
    relatedAlerts: {
      alerts: [],
      nextAlert: null,
    },
    // Required
    ancestry: {
      ancestors: [],
      nextAncestor: cursors.ancestryNextAncestor,
    },
    // Normally, this would have only certain events, but for testing purposes, it will have all events, since
    // the position of events in the ResolverTree is irrelevant.
    lifecycle: events,
    // Required
    stats: {
      events: {
        total: 0,
        byCategory: {},
      },
      totalAlerts: 0,
    },
  };
}

function mockedTree(baseTree: Tree) {
  const { children } = baseTree;
  const firstChildNodeInTree = [...children.values()][0];

  // The `generateBaseTree` mock doesn't calculate stats (the actual data has them.)
  // So calculate some stats for just the node that we'll test.
  // const statsResults = compileStatsForChild(firstChildNodeInTree);

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
      /** if (node.id === firstChildNodeInTree.id) {
        // attach stats
        childNode.stats = {
          events: statsResults.eventStats,
          totalAlerts: 0,
        };
      } */
      return childNode;
    }) as ResolverChildNode[] /**
          Cast to ResolverChildNode[] array is needed because incoming
          TreeNodes from the generator cannot be assigned cleanly to the
          tree model's expected ResolverChildNode type.
        */,
  });
}

export function usingGenerator(): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
} {
  const generator = new EndpointDocGenerator('resolver');
  const tree = generator.generateTree({
    generations: 5,
    children: 3,
    alwaysGenMaxChildrenPerNode: true,
  });

  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin' },
    tree,
  };

  const allData = new Map([[tree.origin.id, tree.origin], ...tree.children, ...tree.ancestry]);

  /* const tree = mockTreeWithOneNodeAndTwoPagesOfRelatedEvents({
    originID: metadata.entityIDs.origin,
  }); */

  return {
    metadata,
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      async relatedEvents({
        entityID,
        timerange,
        indexPatterns,
      }: {
        entityID: string;
        timerange: Timerange;
        indexPatterns: string[];
      }): Promise<ResolverRelatedEvents> {
        return { entityID: '', events: [], nextEvent: null };
      },

      /**
       * If called with an "after" cursor, return the 2nd page, else return the first.
       */
      async eventsWithEntityIDAndCategory({
        entityID,
        category,
        after,
        timerange,
        indexPatterns,
      }: {
        entityID: string;
        category: string;
        after?: string;
        timerange: Timerange;
        indexPatterns: string[];
      }): Promise<{ events: SafeResolverEvent[]; nextEvent: string | null }> {
        return { events: [], nextEvent: null };
      },

      /**
       * Any of the origin's related events by event.id
       */
      async event({
        eventID,
        timerange,
        indexPatterns,
      }: {
        eventID: string;
        timerange: Timerange;
        indexPatterns: string[];
      }): Promise<SafeResolverEvent | null> {
        return null;
      },

      async nodeData({
        ids,
        timerange,
        indexPatterns,
        limit,
      }: {
        ids: string[];
        timerange: Timerange;
        indexPatterns: string[];
        limit: number;
      }): Promise<SafeResolverEvent[]> {
        return ids
          .reduce((acc: SafeResolverEvent[], id: string) => {
            const treeNode = allData.get(id);
            if (treeNode) {
              acc.push(...treeNode.lifecycle);
            }
            return acc;
          }, [])
          .slice(0, limit);
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      async resolverTree(): Promise<ResolverTree> {
        return mockTreeWithNoProcessEvents();
      },

      /**
       * Get entities matching a document.
       */
      async entities(): Promise<ResolverEntityIndex> {
        return [{ entity_id: metadata.entityIDs.origin }];
      },
    },
  };
}
