/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaReactContextValue } from '../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../types';
import { DataAccessLayer, TreeIdSchema, Timerange } from '../types';
import {
  ResolverNode,
  ResolverRelatedEvents,
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
    async relatedEvents({
      entityID,
      timerange,
      indexPatterns,
    }: {
      entityID: string;
      timerange: Timerange;
      indexPatterns: string[];
    }): Promise<ResolverRelatedEvents> {
      const response: ResolverPaginatedEvents = await context.services.http.post(
        '/api/endpoint/resolver/events',
        {
          query: {},
          body: JSON.stringify({
            indexPatterns,
            timerange: {
              from: timerange.from.toISOString(),
              to: timerange.to.toISOString(),
            },
            filter: JSON.stringify({
              bool: {
                filter: [
                  { term: { 'process.entity_id': entityID } },
                  { bool: { must_not: { term: { 'event.category': 'process' } } } },
                ],
              },
            }),
          }),
        }
      );

      return { ...response, entityID };
    },

    /**
     * Return events that have `process.entity_id` that includes `entityID` and that have
     * a `event.category` that includes `category`.
     */
    eventsWithEntityIDAndCategory({
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
    }): Promise<ResolverPaginatedEvents> {
      return context.services.http.post('/api/endpoint/resolver/events', {
        query: { afterEvent: after, limit: 25 },
        body: JSON.stringify({
          timerange: {
            from: timerange.from.toISOString(),
            to: timerange.to.toISOString(),
          },
          indexPatterns,
          filter: JSON.stringify({
            bool: {
              filter: [
                { term: { 'process.entity_id': entityID } },
                { term: { 'event.category': category } },
              ],
            },
          }),
        }),
      });
    },

    /**
     * Retrieves the node data for a set of node IDs. This is specifically for Endpoint graphs. It
     * only returns process lifecycle events.
     */
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
      const response: ResolverPaginatedEvents = await context.services.http.post(
        '/api/endpoint/resolver/events',
        {
          query: { limit },
          body: JSON.stringify({
            timerange: {
              from: timerange.from.toISOString(),
              to: timerange.to.toISOString(),
            },
            indexPatterns,
            filter: JSON.stringify({
              bool: {
                filter: [
                  { terms: { 'process.entity_id': ids } },
                  { term: { 'event.category': 'process' } },
                ],
              },
            }),
          }),
        }
      );
      return response.events;
    },

    /**
     * Return up to one event that has an `event.id` that includes `eventID`.
     */
    async event({
      eventID,
      timerange,
      indexPatterns,
    }: {
      eventID: string;
      timerange: Timerange;
      indexPatterns: string[];
    }): Promise<SafeResolverEvent | null> {
      const response: ResolverPaginatedEvents = await context.services.http.post(
        '/api/endpoint/resolver/events',
        {
          query: { limit: 1 },
          body: JSON.stringify({
            indexPatterns,
            timerange: {
              from: timerange.from.toISOString(),
              to: timerange.to.toISOString(),
            },
            filter: JSON.stringify({
              bool: {
                filter: [{ term: { 'event.id': eventID } }],
              },
            }),
          }),
        }
      );
      const [oneEvent] = response.events;
      return oneEvent ?? null;
    },

    /**
     *
     *
     * @param {string} dataId - Id of the data for what will be the origin node in the graph
     * @param {*} schema - schema detailing what the id and parent fields should be
     * @param {*} timerange
     * @param {string[]} indices
     * @returns {Promise<ResolverNode[]>}
     */
    async resolverTree(
      dataId: string,
      schema: TreeIdSchema,
      timerange: Timerange,
      indices: string[]
    ): Promise<ResolverNode[]> {
      return context.services.http.post('/api/endpoint/resolver/tree', {
        body: JSON.stringify({
          timerange,
          schema,
          nodes: [dataId],
          indexPatterns: indices,
        }),
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
