/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataAccessLayer } from '../../types';
import { mockTreeWithNoAncestorsAndTwoChildrenAndRelatedEventsOnOrigin } from '../../mocks/resolver_tree';
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

export function noAncestorsTwoChildrenWithRelatedEventsOnOrigin(): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
} {
  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin', firstChild: 'firstChild', secondChild: 'secondChild' },
  };
  const tree = mockTreeWithNoAncestorsAndTwoChildrenAndRelatedEventsOnOrigin({
    originID: metadata.entityIDs.origin,
    firstChildID: metadata.entityIDs.firstChild,
    secondChildID: metadata.entityIDs.secondChild,
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
       * Any of the origin's related events by category.
       * `entityID` must match the origin node's `process.entity_id`.
       * Does not respect the `_after` parameter.
       */
      async eventsWithEntityIDAndCategory(
        entityID: string,
        category: string
      ): Promise<{ events: SafeResolverEvent[]; nextEvent: string | null }> {
        const events =
          entityID === metadata.entityIDs.origin
            ? tree.relatedEvents.events.filter((event) =>
                eventModel.eventCategory(event).includes(category)
              )
            : [];
        return {
          events,
          nextEvent: null,
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
        return [{ entity_id: metadata.entityIDs.origin }];
      },
    },
  };
}
