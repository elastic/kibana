/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TreeOptions } from '../../../../common/endpoint/generate_data';
import { DataAccessLayer, GeneratedTreeMetadata, TimeRange } from '../../types';

import {
  ResolverRelatedEvents,
  ResolverEntityIndex,
  SafeResolverEvent,
  ResolverNode,
  ResolverSchema,
} from '../../../../common/endpoint/types';
import * as eventModel from '../../../../common/endpoint/models/event';
import { generateTree } from '../../mocks/generator';

/**
 * This file can be used to create a mock data access layer that leverages a generated tree using the
 * EndpointDocGenerator class. The advantage of using this mock is that it gives us a lot of control how we want the
 * tree to look (ancestors, descendants, generations, related events, etc).
 *
 * The data access layer is mainly useful for testing the nodeData state within resolver.
 */

/**
 * Creates a Data Access Layer based on a resolver generator tree.
 *
 * @param treeOptions options for generating a resolver tree, these are passed to the resolver generator
 * @param dalOverrides a DAL to override the functions in this mock, this allows extra functionality to be specified in the tests
 */
export function generateTreeWithDAL(
  treeOptions?: TreeOptions,
  dalOverrides?: DataAccessLayer
): {
  dataAccessLayer: DataAccessLayer;
  metadata: GeneratedTreeMetadata;
} {
  /**
   * The generateTree function uses a static seed for the random number generated used internally by the
   * function. This means that the generator will return the same generated tree (ids, names, structure, etc) each
   * time the doc generate is used in tests. This way we can rely on the generate returning consistent responses
   * for our tests. The results won't be unpredictable and they will not result in flaky tests.
   */
  const { allNodes, generatedTree, formattedTree } = generateTree(treeOptions);

  const metadata: GeneratedTreeMetadata = {
    databaseDocumentID: '_id',
    generatedTree,
    formattedTree,
  };

  const defaultDAL: DataAccessLayer = {
    /**
     * Fetch related events for an entity ID
     */
    async relatedEvents({
      entityID,
      timeRange,
      indexPatterns,
    }: {
      entityID: string;
      timeRange: TimeRange;
      indexPatterns: string[];
    }): Promise<ResolverRelatedEvents> {
      const node = allNodes.get(entityID);
      const events: SafeResolverEvent[] = [];
      if (node) {
        events.push(...node.relatedEvents);
      }

      return { entityID, events, nextEvent: null };
    },

    /**
     * Returns the related events for a specific ID and category.
     */
    async eventsWithEntityIDAndCategory({
      entityID,
      category,
      after,
      timeRange,
      indexPatterns,
    }: {
      entityID: string;
      category: string;
      after?: string;
      timeRange: TimeRange;
      indexPatterns: string[];
    }): Promise<{ events: SafeResolverEvent[]; nextEvent: string | null }> {
      const node = allNodes.get(entityID);
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
     * Always returns null.
     */
    async event({
      nodeID,
      eventCategory,
      eventTimestamp,
      eventID,
      timeRange,
      indexPatterns,
    }: {
      nodeID: string;
      eventCategory: string[];
      eventTimestamp: string;
      eventID?: string | number;
      timeRange: TimeRange;
      indexPatterns: string[];
    }): Promise<SafeResolverEvent | null> {
      return null;
    },

    /**
     * Returns the lifecycle events for a set of nodes.
     */
    async nodeData({
      ids,
      timeRange,
      indexPatterns,
      limit,
    }: {
      ids: string[];
      timeRange: TimeRange;
      indexPatterns: string[];
      limit: number;
    }): Promise<SafeResolverEvent[]> {
      return ids
        .reduce((acc: SafeResolverEvent[], id: string) => {
          const treeNode = allNodes.get(id);
          if (treeNode) {
            acc.push(...treeNode.lifecycle);
          }
          return acc;
        }, [])
        .slice(0, limit);
    },

    /**
     * Fetches the generated resolver graph.
     */
    async resolverTree({
      dataId,
      schema,
      timeRange,
      indices,
      ancestors,
      descendants,
    }: {
      dataId: string;
      schema: ResolverSchema;
      timeRange: TimeRange;
      indices: string[];
      ancestors: number;
      descendants: number;
    }): Promise<ResolverNode[]> {
      return formattedTree.nodes;
    },

    /**
     * Returns a schema matching the generated graph and the origin's ID.
     */
    async entities(): Promise<ResolverEntityIndex> {
      return [
        {
          name: 'endpoint',
          schema: {
            id: 'process.entity_id',
            parent: 'process.parent.entity_id',
            ancestry: 'process.Ext.ancestry',
            name: 'process.name',
          },
          id: generatedTree.origin.id,
        },
      ];
    },
  };

  return {
    metadata,
    dataAccessLayer: {
      ...defaultDAL,
      ...(dalOverrides ?? {}),
    },
  };
}
