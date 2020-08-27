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
import { DataAccessLayer } from '../../types';

type PausableRequests = 'relatedEvents' | 'resolverTree' | 'entities';

interface Metadata<T> {
  /**
   * The `_id` of the document being analyzed.
   */
  databaseDocumentID: string;
  /**
   * A record of entityIDs to be used in tests assertions.
   */
  entityIDs: T;
}

/**
 * A simple mock dataAccessLayer that allows you to manually pause and resume a request.
 */
export function pausifyMock<T>({
  metadata,
  dataAccessLayer,
}: {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata<T>;
}): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata<T>;
  pause: (pausableRequests: PausableRequests) => void;
  resume: (pausableRequests: PausableRequests) => void;
} {
  let relatedEventsPromise = Promise.resolve();
  let resolverTreePromise = Promise.resolve();
  let entitiesPromise = Promise.resolve();

  let relatedEventsResolver: () => void;
  let resolverTreeResolver: () => void;
  let entitiesResolver: () => void;

  return {
    metadata,
    pause: (pausableRequests: PausableRequests | PausableRequests[]) => {
      const pauseRelatedEventsRequest = pausableRequests.includes('relatedEvents');
      const pauseResolverTreeRequest = pausableRequests.includes('resolverTree');
      const pauseEntitiesRequest = pausableRequests.includes('entities');

      if (pauseRelatedEventsRequest) {
        relatedEventsPromise = new Promise((resolve) => {
          relatedEventsResolver = resolve;
        });
      }
      if (pauseResolverTreeRequest) {
        resolverTreePromise = new Promise((resolve) => {
          resolverTreeResolver = resolve;
        });
      }
      if (pauseEntitiesRequest) {
        entitiesPromise = new Promise((resolve) => {
          entitiesResolver = resolve;
        });
      }
    },
    resume: (pausableRequests: PausableRequests | PausableRequests[]) => {
      const resumeEntitiesRequest = pausableRequests.includes('entities');
      const resumeResolverTreeRequest = pausableRequests.includes('resolverTree');
      const resumeRelatedEventsRequest = pausableRequests.includes('relatedEvents');

      if (resumeEntitiesRequest && entitiesResolver) entitiesResolver();
      if (resumeResolverTreeRequest && resolverTreeResolver) resolverTreeResolver();
      if (resumeRelatedEventsRequest && relatedEventsResolver) relatedEventsResolver();
    },
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      async relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
        await relatedEventsPromise;
        return dataAccessLayer.relatedEvents(entityID);
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      async resolverTree(): Promise<ResolverTree> {
        await resolverTreePromise;
        // @ts-ignore - ignore the argument requirement for dataAccessLayer
        return dataAccessLayer.resolverTree();
      },

      /**
       * Get an array of index patterns that contain events.
       */
      indexPatterns(): string[] {
        return dataAccessLayer.indexPatterns();
      },

      /**
       * Get entities matching a document.
       */
      async entities(): Promise<ResolverEntityIndex> {
        await entitiesPromise;
        // @ts-ignore - ignore the argument requirement for dataAccessLayer
        return dataAccessLayer.entities();
      },
    },
  };
}
