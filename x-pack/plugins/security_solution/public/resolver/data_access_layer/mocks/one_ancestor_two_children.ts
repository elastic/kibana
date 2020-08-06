/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
} from '../../../../common/endpoint/types';
import { mockEndpointEvent } from '../../store/mocks/endpoint_event';
import {
  mockTreeWithNoAncestorsAnd2Children,
  withRelatedEventsOnOrigin,
} from '../../store/mocks/resolver_tree';
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
export function oneAncestorTwoChildren(
  { withRelatedEvents }: { withRelatedEvents: Iterable<[string, string]> | null } = {
    withRelatedEvents: null,
  }
): { dataAccessLayer: DataAccessLayer; metadata: Metadata } {
  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin', firstChild: 'firstChild', secondChild: 'secondChild' },
  };
  const baseTree = mockTreeWithNoAncestorsAnd2Children({
    originID: metadata.entityIDs.origin,
    firstChildID: metadata.entityIDs.firstChild,
    secondChildID: metadata.entityIDs.secondChild,
  });
  const composedTree = withRelatedEvents
    ? withRelatedEventsOnOrigin(baseTree, withRelatedEvents)
    : baseTree;

  return {
    metadata,
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
        return Promise.resolve({
          entityID,
          events:
            /* Respond with the mocked related events when the origin's related events are fetched*/ withRelatedEvents &&
            entityID === metadata.entityIDs.origin
              ? composedTree.relatedEvents.events
              : [
                  mockEndpointEvent({
                    entityID,
                    name: 'event',
                    timestamp: 0,
                  }),
                ],
          nextEvent: null,
        });
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      resolverTree(): Promise<ResolverTree> {
        return Promise.resolve(composedTree);
      },

      /**
       * Get an array of index patterns that contain events.
       */
      indexPatterns(): string[] {
        return ['index pattern'];
      },

      /**
       * Get entities matching a document.
       */
      entities(): Promise<ResolverEntityIndex> {
        return Promise.resolve([{ entity_id: metadata.entityIDs.origin }]);
      },
    },
  };
}
