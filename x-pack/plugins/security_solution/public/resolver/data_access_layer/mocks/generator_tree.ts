/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Tree, TreeOptions } from '../../../../common/endpoint/generate_data';
import { DataAccessLayer, Timerange } from '../../types';

import {
  ResolverRelatedEvents,
  ResolverEntityIndex,
  SafeResolverEvent,
  ResolverNode,
  NewResolverTree,
  ResolverSchema,
} from '../../../../common/endpoint/types';
import * as eventModel from '../../../../common/endpoint/models/event';
import { generateTree } from '../../mocks/generator';

/**
 * Return structure for the mock DAL returned by this file.
 */
export interface Metadata {
  /**
   * The `_id` of the document being analyzed.
   */
  databaseDocumentID: string;
  genTree: Tree;
  tree: NewResolverTree;
}

/**
 * Creates a DAL based on a resolver generator tree.
 *
 * @param treeOptions options for generating a resolver tree, these are passed to the resolver generator
 * @param dalOverrides a DAL to override the functions in this mock, this allows extra functionality to be specified in the tests
 */
export function generateTreeWithDAL(
  treeOptions?: TreeOptions,
  dalOverrides?: DataAccessLayer
): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
} {
  const { allNodes, genTree, tree } = generateTree(treeOptions);

  const metadata: Metadata = {
    databaseDocumentID: '_id',
    genTree,
    tree,
  };

  const defaultDAL: DataAccessLayer = {
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
      timerange,
      indexPatterns,
    }: {
      entityID: string;
      category: string;
      after?: string;
      timerange: Timerange;
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
      timerange,
      indexPatterns,
    }: {
      nodeID: string;
      eventCategory: string[];
      eventTimestamp: string;
      eventID: string;
      timerange: Timerange;
      indexPatterns: string[];
    }): Promise<SafeResolverEvent | null> {
      return null;
    },

    /**
     * Returns the lifecycle events for a set of nodes.
     */
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
      timerange,
      indices,
      ancestors,
      descendants,
    }: {
      dataId: string;
      schema: ResolverSchema;
      timerange: Timerange;
      indices: string[];
      ancestors: number;
      descendants: number;
    }): Promise<ResolverNode[]> {
      return tree.nodes;
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
          id: genTree.origin.id,
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
