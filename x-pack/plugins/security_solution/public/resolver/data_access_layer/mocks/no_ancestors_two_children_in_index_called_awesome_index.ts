/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
  SafeResolverEvent,
} from '../../../../common/endpoint/types';
import { mockEndpointEvent } from '../../mocks/endpoint_event';
import { mockTreeWithNoAncestorsAnd2Children } from '../../mocks/resolver_tree';
import { DataAccessLayer, Timerange } from '../../types';

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
 * A mock DataAccessLayer that will return an origin in two children. The `entity` response will be empty unless
 * `awesome_index` is passed in the indices array.
 */
export function noAncestorsTwoChildenInIndexCalledAwesomeIndex(): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
} {
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
      relatedEvents({
        entityID,
        timerange,
        indexPatterns,
      }: {
        entityID: string;
        timerange: Timerange;
        indexPatterns: string[];
      }): Promise<ResolverRelatedEvents> {
        return Promise.resolve({
          entityID,
          events: [
            mockEndpointEvent({
              entityID,
              processName: 'event',
              timestamp: 0,
            }),
          ],
          nextEvent: null,
        });
      },

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
      }): Promise<{
        events: SafeResolverEvent[];
        nextEvent: string | null;
      }> {
        return {
          events: [
            mockEndpointEvent({
              entityID,
              eventCategory: category,
            }),
          ],
          nextEvent: null,
        };
      },

      async event({
        eventID,
        timerange,
        indexPatterns,
      }: {
        eventID: string;
        timerange: Timerange;
        indexPatterns: string[];
      }): Promise<SafeResolverEvent | null> {
        return mockEndpointEvent({
          entityID: metadata.entityIDs.origin,
          eventID,
        });
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
        return ids.map((id: string) =>
          mockEndpointEvent({
            entityID: id,
          })
        );
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
      entities({ indices }): Promise<ResolverEntityIndex> {
        // Only return values if the `indices` array contains exactly `'awesome_index'`
        if (indices.length === 1 && indices[0] === 'awesome_index') {
          return Promise.resolve([{ entity_id: metadata.entityIDs.origin }]);
        }
        return Promise.resolve([]);
      },
    },
  };
}
