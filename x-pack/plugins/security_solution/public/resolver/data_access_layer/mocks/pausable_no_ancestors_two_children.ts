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
import { mockEndpointEvent } from '../../mocks/endpoint_event';
import { mockTreeWithNoAncestorsAnd2Children } from '../../mocks/resolver_tree';
import { DataAccessLayer } from '../../types';

interface PausableRequests {
  relatedEvents?: boolean;
  resolverTree?: boolean;
  entities?: boolean;
}

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
 * A simple mock dataAccessLayer that allows you to manually pause and resume a request.
 */
export function pausableNoAncestorsTwoChildren(): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
  pause: (pausableRequests?: PausableRequests) => void;
  resume: (pausableRequests?: PausableRequests) => void;
} {
  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin', firstChild: 'firstChild', secondChild: 'secondChild' },
  };

  let relatedEventsPromise = Promise.resolve();
  let resolverTreePromise = Promise.resolve();
  let entitiesPromise = Promise.resolve();

  let relatedEventsResolver: () => void;
  let resolverTreeResolver: () => void;
  let entitiesResolver: () => void;

  return {
    metadata,
    pause: ({ relatedEvents, resolverTree, entities }: PausableRequests) => {
      if (relatedEvents) {
        relatedEventsPromise = new Promise((resolve) => {
          relatedEventsResolver = resolve;
        });
      }
      if (resolverTree) {
        resolverTreePromise = new Promise((resolve) => {
          resolverTreeResolver = resolve;
        });
      }
      if (entities) {
        entitiesPromise = new Promise((resolve) => {
          entitiesResolver = resolve;
        });
      }
    },
    resume: ({ relatedEvents, resolverTree, entities }: PausableRequests) => {
      if (resolverTree && resolverTreeResolver) resolverTreeResolver();
      if (entities && entitiesResolver) entitiesResolver();
      if (relatedEvents && relatedEventsResolver) relatedEventsResolver();
    },
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      async relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
        await relatedEventsPromise;
        return Promise.resolve({
          entityID,
          events: [
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
      async resolverTree(): Promise<ResolverTree> {
        await resolverTreePromise;
        return Promise.resolve(
          mockTreeWithNoAncestorsAnd2Children({
            originID: metadata.entityIDs.origin,
            firstChildID: metadata.entityIDs.firstChild,
            secondChildID: metadata.entityIDs.secondChild,
          })
        );
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
      async entities(): Promise<ResolverEntityIndex> {
        await entitiesPromise;
        return Promise.resolve([{ entity_id: metadata.entityIDs.origin }]);
      },
    },
  };
}
