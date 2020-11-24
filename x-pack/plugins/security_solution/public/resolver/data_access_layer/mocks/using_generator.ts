/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EndpointDocGenerator,
  Event,
  Tree,
  TreeNode,
  TreeOptions,
} from '../../../../common/endpoint/generate_data';
import { DataAccessLayer, Timerange, TreeIdSchema } from '../../types';

import {
  ResolverRelatedEvents,
  ResolverEntityIndex,
  SafeResolverEvent,
  ResolverNode,
  FieldsObject,
  EventStats,
  NewResolverTree,
} from '../../../../common/endpoint/types';
import * as eventModel from '../../../../common/endpoint/models/event';

export interface Metadata {
  /**
   * The `_id` of the document being analyzed.
   */
  databaseDocumentID: string;
  tree: Tree;
  structuredTree: NewResolverTree;
}

export function generateStructuredTree(tree: Tree) {
  const allData = new Map([[tree.origin.id, tree.origin], ...tree.children, ...tree.ancestry]);

  /**
   * Creates an EventStats object from a generated TreeNOde.
   * @param node a TreeNode created by the EndpointDocGenerator
   */
  const buildStats = (node: TreeNode): EventStats => {
    return node.relatedEvents.reduce(
      (accStats: EventStats, event: SafeResolverEvent) => {
        accStats.total += 1;
        const categories = eventModel.eventCategory(event);
        if (categories.length > 0) {
          const category = categories[0];
          if (accStats.byCategory[category] === undefined) {
            accStats.byCategory[category] = 1;
          } else {
            accStats.byCategory[category] += 1;
          }
        }
        return accStats;
      },
      { total: 0, byCategory: {} }
    );
  };

  /**
   * Builds a fields object style object from a generated event.
   *
   * @param {SafeResolverEvent} event a lifecycle event to convert into FieldObject style
   */
  const buildFieldsObj = (event: Event): FieldsObject => {
    return {
      '@timestamp': eventModel.timestampSafeVersion(event) ?? 0,
      'process.entity_id': eventModel.entityIDSafeVersion(event) ?? '',
      'process.parent.entity_id': eventModel.parentEntityIDSafeVersion(event) ?? '',
      'process.name': eventModel.processNameSafeVersion(event) ?? '',
    };
  };

  const treeResponse = Array.from(allData.values()).reduce(
    (acc: ResolverNode[], node: TreeNode) => {
      const lifecycleEvent = node.lifecycle[0];
      acc.push({
        data: buildFieldsObj(lifecycleEvent),
        id: node.id,
        parent: eventModel.parentEntityIDSafeVersion(lifecycleEvent),
        stats: buildStats(node),
        name: eventModel.processNameSafeVersion(lifecycleEvent),
      });
      return acc;
    },
    []
  );

  return {
    nodes: treeResponse,
    originId: tree.origin.id,
  };
}

export function usingGenerator(
  treeOptions?: TreeOptions
): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
} {
  const generator = new EndpointDocGenerator('resolver');
  const tree = generator.generateTree({
    ...treeOptions,
    alwaysGenMaxChildrenPerNode: true,
  });
  // ancestors: 5,
  // relatedEvents: relatedEventsToGen,
  // relatedAlerts,
  // children: 3,
  // generations: 2,
  // percentTerminated: 100,
  // percentWithRelated: 100,
  // numTrees: 1,
  // alwaysGenMaxChildrenPerNode: true,
  // ancestryArraySize: 2,

  const metadata: Metadata = {
    databaseDocumentID: '_id',
    tree,
    structuredTree: generateStructuredTree(tree),
  };

  const allData = new Map([[tree.origin.id, tree.origin], ...tree.children, ...tree.ancestry]);

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
        const node = allData.get(entityID);
        const events: SafeResolverEvent[] = [];
        if (node) {
          events.push(...node.relatedEvents);
        }

        return { entityID, events, nextEvent: null };
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
        const node = allData.get(entityID);
        const events: SafeResolverEvent[] = [];
        if (node) {
          events.push(
            ...node.relatedEvents.filter((event: SafeResolverEvent) => {
              const categories = eventModel.eventCategory(event);
              return categories.length > 0 && categories[0] === category;
            })
          );
        }

        return { events, nextEvent: null };
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
      async resolverTree({
        dataId,
        schema,
        timerange,
        indices,
        ancestors,
        descendants,
      }: {
        dataId: string;
        schema: TreeIdSchema;
        timerange: Timerange;
        indices: string[];
        ancestors: number;
        descendants: number;
      }): Promise<ResolverNode[]> {
        /**
         * Creates an EventStats object from a generated TreeNOde.
         * @param node a TreeNode created by the EndpointDocGenerator
         */
        const buildStats = (node: TreeNode): EventStats => {
          return node.relatedEvents.reduce(
            (accStats: EventStats, event: SafeResolverEvent) => {
              accStats.total += 1;
              const categories = eventModel.eventCategory(event);
              if (categories.length > 0) {
                const category = categories[0];
                if (accStats.byCategory[category] === undefined) {
                  accStats.byCategory[category] = 1;
                } else {
                  accStats.byCategory[category] += 1;
                }
              }
              return accStats;
            },
            { total: 0, byCategory: {} }
          );
        };

        /**
         * Builds a fields object style object from a generated event.
         *
         * @param {SafeResolverEvent} event a lifecycle event to convert into FieldObject style
         */
        const buildFieldsObj = (event: Event): FieldsObject => {
          return {
            '@timestamp': eventModel.timestampSafeVersion(event) ?? 0,
            'process.entity_id': eventModel.entityIDSafeVersion(event) ?? '',
            'process.parent.entity_id': eventModel.parentEntityIDSafeVersion(event) ?? '',
            'process.name': eventModel.processNameSafeVersion(event) ?? '',
          };
        };

        return Array.from(allData.values()).reduce((acc: ResolverNode[], node: TreeNode) => {
          const lifecycleEvent = node.lifecycle[0];
          acc.push({
            data: buildFieldsObj(lifecycleEvent),
            id: node.id,
            parent: eventModel.parentEntityIDSafeVersion(lifecycleEvent),
            stats: buildStats(node),
            name: eventModel.processNameSafeVersion(lifecycleEvent),
          });
          return acc;
        }, []);
      },

      /**
       * Get entities matching a document.
       */
      async entities(): Promise<ResolverEntityIndex> {
        return [{ entity_id: tree.origin.id }];
      },
    },
  };
}
