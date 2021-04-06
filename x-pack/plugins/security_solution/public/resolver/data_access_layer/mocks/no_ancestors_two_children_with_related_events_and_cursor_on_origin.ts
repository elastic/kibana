/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataAccessLayer, TimeRange } from '../../types';
import {
  mockTreeWithNoAncestorsAndTwoChildrenAndRelatedEventsOnOrigin,
  firstRelatedEventID,
  secondRelatedEventID,
} from '../../mocks/resolver_tree';
import {
  ResolverRelatedEvents,
  ResolverEntityIndex,
  SafeResolverEvent,
  ResolverNode,
  ResolverSchema,
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

/**
 * See the other mock `noAncestorsTwoChildrenWithRelatedEventsOnOrigin` but this one
 * has one of the related events "after" the first (i.e. you have to call with `after` to
 * get the second one).
 */
export function noAncestorsTwoChildrenWithRelatedEventsOnOriginWithOneAfterCursor(): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
} {
  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin', firstChild: 'firstChild', secondChild: 'secondChild' },
  };
  const {
    tree,
    relatedEvents,
    nodeDataResponse,
  } = mockTreeWithNoAncestorsAndTwoChildrenAndRelatedEventsOnOrigin({
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
      async relatedEvents({
        entityID,
        timeRange,
        indexPatterns,
      }: {
        entityID: string;
        timeRange: TimeRange;
        indexPatterns: string[];
      }): Promise<ResolverRelatedEvents> {
        /**
         * Respond with the mocked related events when the origin's related events are fetched.
         **/
        const events = entityID === metadata.entityIDs.origin ? relatedEvents.events : [];

        return {
          entityID,
          events,
          nextEvent: null,
        };
      },

      /**
       * Any of the origin's related events by category.
       * `entityID` must match the origin node's `process.entity_id`.
       * These are split by the `after` cursor: Calling without the cursor will
       * return the first event, calling with the cursor set to the id of the first event
       * will return the second.
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
        /**
         * For testing: This 'fakes' the behavior of one related event being `after`
         * a cursor for an earlier event.
         * @param event A `SafeResolverEvent` to filter
         */
        function splitOnCursor(event: SafeResolverEvent) {
          if (typeof after === 'undefined') {
            return eventModel.eventID(event) === firstRelatedEventID;
          }
          if (after === firstRelatedEventID) {
            return eventModel.eventID(event) === secondRelatedEventID;
          }
          return false;
        }

        const events =
          entityID === metadata.entityIDs.origin
            ? relatedEvents.events.filter(
                (event) =>
                  eventModel.eventCategory(event).includes(category) && splitOnCursor(event)
              )
            : [];
        return {
          events,
          nextEvent: typeof after === 'undefined' ? firstRelatedEventID : null,
        };
      },

      /**
       * Any of the origin's related events by event.id
       */
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
        return relatedEvents.events.find((event) => eventModel.eventID(event) === eventID) ?? null;
      },

      /**
       * Returns a static array of events. Ignores request parameters.
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
        return nodeDataResponse;
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
        return tree.nodes;
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
              name: 'process.name',
            },
            id: metadata.entityIDs.origin,
          },
        ];
      },
    },
  };
}
