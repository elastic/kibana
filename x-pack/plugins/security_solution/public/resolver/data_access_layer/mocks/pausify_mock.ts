/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolverNode, SafeResolverEvent } from '../../../../common/endpoint/types';

import { ResolverRelatedEvents, ResolverEntityIndex } from '../../../../common/endpoint/types';
import { DataAccessLayer } from '../../types';

type PausableRequests =
  | 'relatedEvents'
  | 'resolverTree'
  | 'entities'
  | 'eventsWithEntityIDAndCategory'
  | 'event'
  | 'nodeData';

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
  pause: (pausableRequests: PausableRequests[]) => void;
  resume: (pausableRequests: PausableRequests[]) => void;
} {
  let relatedEventsPromise = Promise.resolve();
  let eventsWithEntityIDAndCategoryPromise = Promise.resolve();
  let eventPromise = Promise.resolve();
  let nodeDataPromise = Promise.resolve();
  let resolverTreePromise = Promise.resolve();
  let entitiesPromise = Promise.resolve();

  let relatedEventsResolver: (() => void) | null;
  let eventsWithEntityIDAndCategoryResolver: (() => void) | null;
  let eventResolver: (() => void) | null;
  let nodeDataResolver: (() => void) | null;
  let resolverTreeResolver: (() => void) | null;
  let entitiesResolver: (() => void) | null;

  return {
    metadata,
    pause: (pausableRequests: PausableRequests[]) => {
      const pauseRelatedEventsRequest = pausableRequests.includes('relatedEvents');
      const pauseResolverTreeRequest = pausableRequests.includes('resolverTree');
      const pauseEntitiesRequest = pausableRequests.includes('entities');
      const pauseEventsWithEntityIDAndCategoryRequest = pausableRequests.includes(
        'eventsWithEntityIDAndCategory'
      );
      const pauseEventRequest = pausableRequests.includes('event');
      const pauseNodeDataRequest = pausableRequests.includes('nodeData');

      if (pauseRelatedEventsRequest && !relatedEventsResolver) {
        relatedEventsPromise = new Promise((resolve) => {
          relatedEventsResolver = resolve;
        });
      }
      if (pauseEventsWithEntityIDAndCategoryRequest && !eventsWithEntityIDAndCategoryResolver) {
        eventsWithEntityIDAndCategoryPromise = new Promise((resolve) => {
          eventsWithEntityIDAndCategoryResolver = resolve;
        });
      }
      if (pauseEventRequest && !eventResolver) {
        eventPromise = new Promise((resolve) => {
          eventResolver = resolve;
        });
      }
      if (pauseRelatedEventsRequest && !relatedEventsResolver) {
        relatedEventsPromise = new Promise((resolve) => {
          relatedEventsResolver = resolve;
        });
      }
      if (pauseNodeDataRequest && !nodeDataResolver) {
        nodeDataPromise = new Promise((resolve) => {
          nodeDataResolver = resolve;
        });
      }
      if (pauseResolverTreeRequest && !resolverTreeResolver) {
        resolverTreePromise = new Promise((resolve) => {
          resolverTreeResolver = resolve;
        });
      }
      if (pauseEntitiesRequest && !entitiesResolver) {
        entitiesPromise = new Promise((resolve) => {
          entitiesResolver = resolve;
        });
      }
    },
    resume: (pausableRequests: PausableRequests[]) => {
      const resumeEntitiesRequest = pausableRequests.includes('entities');
      const resumeResolverTreeRequest = pausableRequests.includes('resolverTree');
      const resumeRelatedEventsRequest = pausableRequests.includes('relatedEvents');
      const resumeEventsWithEntityIDAndCategoryRequest = pausableRequests.includes(
        'eventsWithEntityIDAndCategory'
      );
      const resumeEventRequest = pausableRequests.includes('event');
      const resumeNodeDataRequest = pausableRequests.includes('nodeData');

      if (resumeEntitiesRequest && entitiesResolver) {
        entitiesResolver();
        entitiesResolver = null;
      }
      if (resumeResolverTreeRequest && resolverTreeResolver) {
        resolverTreeResolver();
        resolverTreeResolver = null;
      }
      if (resumeRelatedEventsRequest && relatedEventsResolver) {
        relatedEventsResolver();
        relatedEventsResolver = null;
      }
      if (resumeEventsWithEntityIDAndCategoryRequest && eventsWithEntityIDAndCategoryResolver) {
        eventsWithEntityIDAndCategoryResolver();
        eventsWithEntityIDAndCategoryResolver = null;
      }
      if (resumeEventRequest && eventResolver) {
        eventResolver();
        eventResolver = null;
      }
      if (resumeNodeDataRequest && nodeDataResolver) {
        nodeDataResolver();
        nodeDataResolver = null;
      }
    },
    dataAccessLayer: {
      ...dataAccessLayer,
      /**
       * Fetch related events for an entity ID
       */
      async relatedEvents(...args): Promise<ResolverRelatedEvents> {
        await relatedEventsPromise;
        return dataAccessLayer.relatedEvents(...args);
      },

      /**
       * Fetch related events for an entity ID
       */
      async eventsWithEntityIDAndCategory(...args): Promise<{
        events: SafeResolverEvent[];
        nextEvent: string | null;
      }> {
        await eventsWithEntityIDAndCategoryPromise;
        return dataAccessLayer.eventsWithEntityIDAndCategory(...args);
      },

      /**
       * Fetch related events for an entity ID
       */
      async event(...args): Promise<SafeResolverEvent | null> {
        await eventPromise;
        return dataAccessLayer.event(...args);
      },

      async nodeData(...args): Promise<SafeResolverEvent[]> {
        await nodeDataPromise;
        return dataAccessLayer.nodeData(...args);
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      async resolverTree(...args): Promise<ResolverNode[]> {
        await resolverTreePromise;
        return dataAccessLayer.resolverTree(...args);
      },

      /**
       * Get entities matching a document.
       */
      async entities(...args): Promise<ResolverEntityIndex> {
        await entitiesPromise;
        return dataAccessLayer.entities(...args);
      },
    },
  };
}
