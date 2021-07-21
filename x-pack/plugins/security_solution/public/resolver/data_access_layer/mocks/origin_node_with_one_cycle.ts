/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ResolverRelatedEvents,
  SafeResolverEvent,
  ResolverEntityIndex,
  ResolverNode,
  ResolverSchema,
} from '../../../../common/endpoint/types';
import { mockTreeWithOriginAndOneCycle } from '../../mocks/resolver_tree';
import { DataAccessLayer, TimeRange } from '../../types';

interface Metadata {
  /**
   * The `_id` of the document being analyzed.
   */
  databaseDocumentID: string;
  /**
   * A record of entityIDs to be used in tests assertions.
   */
  entityIDs: {
    /**
     * The entityID of the node related to the document being analyzed.
     */
    origin: 'origin';
    /**
     * The entityID of the first child of the origin.
     */
    firstChild: 'firstChild';
  };
}

/**
 * A simple mock dataAccessLayer possible that returns a tree with 0 ancestors 1 child (origin) and 1 node that self references for the parent.entity_id.
 * 1 related event is returned. The parameter to `entities` is ignored.
 */
export function originNodeWithOneCycle(): { dataAccessLayer: DataAccessLayer; metadata: Metadata } {
  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin', firstChild: 'firstChild' },
  };
  return {
    metadata,
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      relatedEvents({
        entityID,
        timeRange,
        indexPatterns,
      }: {
        entityID: string;
        timeRange: TimeRange;
        indexPatterns: string[];
      }): Promise<ResolverRelatedEvents> {
        return Promise.resolve({
          entityID,
          events: [],
          nextEvent: null,
        });
      },

      /**
       * Return events that have `process.entity_id` that includes `entityID` and that have
       * a `event.category` that includes `category`.
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
      }): Promise<{
        events: SafeResolverEvent[];
        nextEvent: string | null;
      }> {
        const events: SafeResolverEvent[] = [];
        return {
          events,
          nextEvent: null,
        };
      },

      async event({
        nodeID,
        eventID,
        eventCategory,
        eventTimestamp,
        winlogRecordID,
        timeRange,
        indexPatterns,
      }: {
        nodeID: string;
        eventCategory: string[];
        eventTimestamp: string;
        eventID?: string | number;
        winlogRecordID: string;
        timeRange: TimeRange;
        indexPatterns: string[];
      }): Promise<SafeResolverEvent | null> {
        return null;
      },

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
        return [];
      },

      /**
       * Fetch a ResolverTree for a entityID
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
        const { treeResponse } = mockTreeWithOriginAndOneCycle({
          originID: metadata.entityIDs.origin,
          firstChildID: metadata.entityIDs.firstChild,
        });

        return Promise.resolve(treeResponse);
      },

      /**
       * Get entities matching a document.
       */
      entities(): Promise<ResolverEntityIndex> {
        return Promise.resolve([
          {
            name: 'endpoint',
            schema: {
              id: 'process.entity_id',
              parent: 'process.parent.entity_id',
              ancestry: 'process.Ext.ancestry',
              name: 'process.name',
            },
            id: metadata.entityIDs.origin,
          },
        ]);
      },
    },
  };
}
