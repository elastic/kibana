/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { HttpHandler } from 'kibana/public';
import { KibanaReactContextValue } from '../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../types';
import { ResolverState, ResolverAction } from '../types';
import {
  ResolverEvent,
  ResolverChildren,
  ResolverAncestry,
  LifecycleNode,
  ResolverRelatedEvents,
  ResolverNodeStats,
} from '../../../common/endpoint/types';
import * as event from '../../../common/endpoint/models/event';

type MiddlewareFactory<S = ResolverState> = (
  context?: KibanaReactContextValue<StartServices>
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

function getLifecycleEventsAndStats(
  nodes: LifecycleNode[],
  stats: Map<string, ResolverNodeStats>
): ResolverEvent[] {
  return nodes.reduce((flattenedEvents: ResolverEvent[], currentNode: LifecycleNode) => {
    if (currentNode.lifecycle && currentNode.lifecycle.length > 0) {
      flattenedEvents.push(...currentNode.lifecycle);
    }

    if (currentNode.stats) {
      stats.set(currentNode.entityID, currentNode.stats);
    }

    return flattenedEvents;
  }, []);
}

type RelatedEventAPIResponse = 'error' | ResolverRelatedEvents;
// TODO heaaaalppp we probably want to keep this since Brent will need it???
/**
 * As the design goal of this stopgap was to prevent saturating the server with /events
 * requests, this generator intentionally processes events in serial rather than in parallel.
 * @param eventsToFetch
 *  events to run against the /id/events API
 * @param httpGetter
 *  the HttpHandler to use
 */
async function* getEachRelatedEventsResult(
  eventsToFetch: ResolverEvent[],
  httpGetter: HttpHandler
): AsyncGenerator<[ResolverEvent, RelatedEventAPIResponse]> {
  for (const eventToQueryForRelateds of eventsToFetch) {
    const id = event.entityId(eventToQueryForRelateds);
    let result: RelatedEventAPIResponse;
    try {
      result = await httpGetter(`/api/endpoint/resolver/${id}/events`, {
        query: { events: 100 },
      });
    } catch (e) {
      result = 'error';
    }
    yield [eventToQueryForRelateds, result];
  }
}

export const resolverMiddlewareFactory: MiddlewareFactory = (context) => {
  return (api) => (next) => async (action: ResolverAction) => {
    next(action);
    if (action.type === 'userChangedSelectedEvent') {
      /**
       * concurrently fetches a process's details, its ancestors, and its related events.
       */
      if (context?.services.http && action.payload.selectedEvent) {
        api.dispatch({ type: 'appRequestedResolverData' });
        try {
          let lifecycle: ResolverEvent[];
          let children: ResolverChildren;
          let ancestry: ResolverAncestry;
          let entityID: string;
          let stats: ResolverNodeStats;
          if (event.isLegacyEvent(action.payload.selectedEvent)) {
            const entityId = action.payload.selectedEvent?.endgame?.unique_pid;
            const legacyEndpointID = action.payload.selectedEvent?.agent?.id;
            [{ lifecycle, children, ancestry, entityID, stats }] = await Promise.all([
              context.services.http.get(`/api/endpoint/resolver/${entityId}`, {
                query: { legacyEndpointID, children: 5, ancestors: 5 },
              }),
            ]);
          } else {
            const entityId = action.payload.selectedEvent.process.entity_id;
            [{ lifecycle, children, ancestry, entityID, stats }] = await Promise.all([
              context.services.http.get(`/api/endpoint/resolver/${entityId}`, {
                query: {
                  children: 5,
                  ancestors: 5,
                },
              }),
            ]);
          }
          const nodeStats: Map<string, ResolverNodeStats> = new Map();
          nodeStats.set(entityID, stats);
          const events = [
            ...lifecycle,
            ...getLifecycleEventsAndStats(children.childNodes, nodeStats),
            ...getLifecycleEventsAndStats(ancestry.ancestors, nodeStats),
          ];
          api.dispatch({
            type: 'serverReturnedResolverData',
            events,
            stats: nodeStats,
          });
        } catch (error) {
          api.dispatch({
            type: 'serverFailedToReturnResolverData',
          });
        }
      }
    }
  };
};
