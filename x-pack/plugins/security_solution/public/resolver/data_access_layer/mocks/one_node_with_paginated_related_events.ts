/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataAccessLayer } from '../../types';
import { mockTreeWithOneNodeAndTwoPagesOfRelatedEvents } from '../../mocks/resolver_tree';
import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
  SafeResolverEvent,
} from '../../../../common/endpoint/types';
import * as eventModel from '../../../../common/endpoint/models/event';

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
  };
}
export function oneNodeWithPaginatedEvents(): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
} {
  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin' },
  };
  const tree = mockTreeWithOneNodeAndTwoPagesOfRelatedEvents({
    originID: metadata.entityIDs.origin,
  });

  return {
    metadata,
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      async relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
        /**
         * Respond with the mocked related events when the origin's related events are fetched.
         **/
        const events = entityID === metadata.entityIDs.origin ? tree.relatedEvents.events : [];

        return {
          entityID,
          events,
          nextEvent: null,
        };
      },

      /**
       * If called with an "after" cursor, return the 2nd page, else return the first.
       */
      async eventsWithEntityIDAndCategory(
        entityID: string,
        category: string,
        after?: string
      ): Promise<{ events: SafeResolverEvent[]; nextEvent: string | null }> {
        let events: SafeResolverEvent[] = [];
        const eventsOfCategory = tree.relatedEvents.events.filter(
          (event) => event.event?.category === category
        );
        if (after === undefined) {
          events = eventsOfCategory.slice(0, 25);
        } else {
          events = eventsOfCategory.slice(25);
        }
        return {
          events,
          nextEvent: typeof after === 'undefined' ? 'firstEventPage2' : null,
        };
      },

      /**
       * Any of the origin's related events by event.id
       */
      async event(eventID: string): Promise<SafeResolverEvent | null> {
        return (
          tree.relatedEvents.events.find((event) => eventModel.eventID(event) === eventID) ?? null
        );
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      async resolverTree(): Promise<ResolverTree> {
        return tree;
      },

      /**
       * Get entities matching a document.
       */
      async entities(): Promise<ResolverEntityIndex> {
        return [
          {
            name: 'endpoint',
            schema: {
              id: 'process.entity_id',
              parent: 'process.parent.entity_id',
              ancestry: 'process.Ext.ancestry',
            },
            id: metadata.entityIDs.origin,
          },
        ];
      },
    },
  };
}
