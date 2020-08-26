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
import {
  mockTreeWithNoAncestorsAnd2Children,
  mockTreeWithNoProcessEvents,
} from '../../mocks/resolver_tree';
import { DataAccessLayer } from '../../types';

interface EmptiableRequests {
  indexPatterns?: boolean;
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
 * A simple mock dataAccessLayer that allows you to configure which requests return an empty set of data.
 */
export function emptiableNoAncestorsTwoChildren(
  dataShouldBeEmpty?: EmptiableRequests
): {
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
      relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
        return dataShouldBeEmpty?.relatedEvents
          ? Promise.resolve({
              entityID,
              events: [],
              nextEvent: null,
            })
          : Promise.resolve({
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
      resolverTree(): Promise<ResolverTree> {
        return dataShouldBeEmpty?.resolverTree
          ? Promise.resolve(mockTreeWithNoProcessEvents())
          : Promise.resolve(
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
        return dataShouldBeEmpty?.indexPatterns ? [] : ['index pattern'];
      },

      /**
       * Get entities matching a document.
       */
      entities(): Promise<ResolverEntityIndex> {
        return dataShouldBeEmpty?.entities
          ? Promise.resolve([])
          : Promise.resolve([{ entity_id: metadata.entityIDs.origin }]);
      },
    },
  };
}
