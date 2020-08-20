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
 * A data access layer which never resolves.
 */
export function nonResolvingRequests(
  pauseOptions: { relatedEvents: boolean; resolverTree: boolean; entities: boolean },
  rejectOptions: { relatedEvents: boolean; resolverTree: boolean; entities: boolean }
): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
  unpause: () => void;
} {
  const metadata: Metadata = {
    databaseDocumentID: '_id',
    entityIDs: { origin: 'origin', firstChild: 'firstChild', secondChild: 'secondChild' },
  };
  return {
    metadata,
    unpause: () => {
      pauseOptions.relatedEvents = false;
      pauseOptions.entities = false;
      pauseOptions.resolverTree = false;
    },
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
        const startTime = Date.now();
        return new Promise((resolve, reject) =>
          setTimeout(() => {
            while (pauseOptions.relatedEvents) {
              if (Date.now() - startTime > 5000) break;
              // keep the promise from executing
            }
            if (rejectOptions.relatedEvents) {
              reject(Error('Umm, no events here buddy'));
            }
            resolve({
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
          }, 0)
        );
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      resolverTree(): Promise<ResolverTree> {
        const startTime = Date.now();
        return new Promise((resolve, reject) =>
          setTimeout(() => {
            while (pauseOptions.resolverTree) {
              if (Date.now() - startTime > 3000) break;
              // keep the promise from executing
            }
            if (rejectOptions.relatedEvents) {
              reject(Error('Umm, no tree here buddy, just shrubs'));
            }
            resolve(
              mockTreeWithNoAncestorsAnd2Children({
                originID: metadata.entityIDs.origin,
                firstChildID: metadata.entityIDs.firstChild,
                secondChildID: metadata.entityIDs.secondChild,
              })
            );
          }, 0)
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
      entities(): Promise<ResolverEntityIndex> {
        const startTime = Date.now();
        return new Promise((resolve, reject) =>
          setTimeout(() => {
            while (pauseOptions.entities) {
              if (Date.now() - startTime > 3000) break;
              // keep the promise from executing
            }
            if (rejectOptions.relatedEvents) {
              reject(Error('Umm, no tree here buddy, just shrubs'));
            }
            resolve([{ entity_id: metadata.entityIDs.origin }]);
          }, 0)
        );
      },
    },
  };
}
