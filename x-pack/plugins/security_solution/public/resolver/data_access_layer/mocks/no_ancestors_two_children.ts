/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverRelatedEvents,
  SafeResolverEvent,
  ResolverTree,
  ResolverEntityIndex,
} from '../../../../common/endpoint/types';
import { mockTreeWithNoAncestorsAnd2Children } from '../../mocks/resolver_tree';
import { DataAccessLayer } from '../../types';

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
    /**
     * The entityID of the second child of the origin.
     */
    secondChild: 'secondChild';
  };
}

/**
 * A simple mock dataAccessLayer possible that returns a tree with 0 ancestors and 2 direct children. 1 related event is returned. The parameter to `entities` is ignored.
 */
export function noAncestorsTwoChildren(): { dataAccessLayer: DataAccessLayer; metadata: Metadata } {
  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin', firstChild: 'firstChild', secondChild: 'secondChild' },
  };
  return {
    metadata,
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
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
      async eventsWithEntityIDAndCategory(
        entityID: string,
        category: string,
        after?: string
      ): Promise<{
        events: SafeResolverEvent[];
        nextEvent: string | null;
      }> {
        const events: SafeResolverEvent[] = [];
        return {
          events,
          nextEvent: null,
        };
      },

      async event(_eventID: string): Promise<SafeResolverEvent | null> {
        return null;
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      resolverTree(): Promise<ResolverTree> {
        return Promise.resolve(
          mockTreeWithNoAncestorsAnd2Children({
            originID: metadata.entityIDs.origin,
            firstChildID: metadata.entityIDs.firstChild,
            secondChildID: metadata.entityIDs.secondChild,
          })
        );
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
            },
            id: metadata.entityIDs.origin,
          },
        ]);
      },
    },
  };
}
