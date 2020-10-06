/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaReactContextValue } from '../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../types';
import { DataAccessLayer } from '../types';
import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
  ResolverPaginatedEvents,
  SafeResolverEvent,
} from '../../../common/endpoint/types';

/**
 * The data access layer for resolver. All communication with the Kibana server is done through this object. This object is provided to Resolver. In tests, a mock data access layer can be used instead.
 */
export function dataAccessLayerFactory(
  context: KibanaReactContextValue<StartServices>
): DataAccessLayer {
  const dataAccessLayer: DataAccessLayer = {
    /**
     * Used to get non-process related events for a node.
     * @deprecated use the new API (eventsWithEntityIDAndCategory & event) instead
     */
    async relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
      const response: ResolverPaginatedEvents = await context.services.http.post(
        '/api/endpoint/resolver/events',
        {
          query: {},
          body: JSON.stringify({
            filter: `process.entity_id:"${entityID}" and not event.category:"process"`,
          }),
        }
      );

      return { ...response, entityID };
    },

    /**
     * Return events that have `process.entity_id` that includes `entityID` and that have
     * a `event.category` that includes `category`.
     */
    eventsWithEntityIDAndCategory(
      entityID: string,
      category: string,
      after?: string
    ): Promise<ResolverPaginatedEvents> {
      return context.services.http.post('/api/endpoint/resolver/events', {
        query: { afterEvent: after, limit: 25 },
        body: JSON.stringify({
          filter: `process.entity_id:"${entityID}" and event.category:"${category}"`,
        }),
      });
    },

    /**
     * Return up to one event that has an `event.id` that includes `eventID`.
     */
    async event(eventID: string): Promise<SafeResolverEvent | null> {
      const response: ResolverPaginatedEvents = await context.services.http.post(
        '/api/endpoint/resolver/events',
        {
          query: { limit: 1 },
          body: JSON.stringify({ filter: `event.id:"${eventID}"` }),
        }
      );
      const [oneEvent] = response.events;
      return oneEvent ?? null;
    },

    /**
     * Used to get descendant and ancestor process events for a node.
     */
    async resolverTree(entityID: string, signal: AbortSignal): Promise<ResolverTree> {
      return context.services.http.get(`/api/endpoint/resolver/${entityID}`, {
        signal,
      });
    },

    /**
     * Used to get the entity_id for an _id.
     */
    async entities({
      _id,
      indices,
      signal,
    }: {
      _id: string;
      indices: string[];
      signal: AbortSignal;
    }): Promise<ResolverEntityIndex> {
      return context.services.http.get('/api/endpoint/resolver/entity', {
        signal,
        query: {
          _id,
          indices,
        },
      });
    },
  };
  return dataAccessLayer;
}
