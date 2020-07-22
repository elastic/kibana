/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataAccessLayer } from '../types';
import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
} from '../../../common/endpoint/types';
import { mockEndpointEvent } from '../store/mocks/endpoint_event';
import { mockTreeWithNoAncestorsAnd2Children } from '../store/mocks/resolver_tree';

/**
 * Simplest mock dataAccessLayer possible.
 */
export function mockDataAccessLayer(): DataAccessLayer {
  const originID = 'a';
  return {
    /**
     * Fetch related events for an entity ID
     */
    relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
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
    resolverTree(): Promise<ResolverTree> {
      return Promise.resolve(
        mockTreeWithNoAncestorsAnd2Children({
          originID,
          firstChildID: 'b',
          secondChildID: 'c',
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
    entities(): Promise<ResolverEntityIndex> {
      return Promise.resolve([{ entity_id: 'a' }]);
    },
  };
}
