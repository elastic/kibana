/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { HttpHandler } from 'kibana/public';
import { KibanaReactContextValue } from '../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../types';
import { ResolverState, ResolverAction, RelatedEventDataEntry } from '../types';
import {
  ResolverEvent,
  ResolverChildren,
  ResolverAncestry,
  LifecycleNode,
  ResolverRelatedEvents,
} from '../../../common/endpoint/types';
import * as event from '../../../common/endpoint/models/event';

type MiddlewareFactory<S = ResolverState> = (
  context?: KibanaReactContextValue<StartServices>
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

function getLifecycleEvents(nodes: LifecycleNode[], events: ResolverEvent[] = []): ResolverEvent[] {
  return nodes.reduce((flattenedEvents, currentNode) => {
    if (currentNode.lifecycle && currentNode.lifecycle.length > 0) {
      flattenedEvents.push(...currentNode.lifecycle);
    }

    return flattenedEvents;
  }, events);
}

type RelatedEventAPIResponse = 'error' | ResolverRelatedEvents;
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
          if (event.isLegacyEvent(action.payload.selectedEvent)) {
            const entityId = action.payload.selectedEvent?.endgame?.unique_pid;
            const legacyEndpointID = action.payload.selectedEvent?.agent?.id;
            [{ lifecycle, children, ancestry }] = await Promise.all([
              context.services.http.get(`/api/endpoint/resolver/${entityId}`, {
                query: { legacyEndpointID, children: 5, ancestors: 5 },
              }),
            ]);
          } else {
            const entityId = action.payload.selectedEvent.process.entity_id;
            [{ lifecycle, children, ancestry }] = await Promise.all([
              context.services.http.get(`/api/endpoint/resolver/${entityId}`, {
                query: {
                  children: 5,
                  ancestors: 5,
                },
              }),
            ]);
          }
          const response: ResolverEvent[] = [
            ...lifecycle,
            ...getLifecycleEvents(children.childNodes),
            ...getLifecycleEvents(ancestry.ancestors),
          ];
          api.dispatch({
            type: 'serverReturnedResolverData',
            payload: response,
          });
        } catch (error) {
          api.dispatch({
            type: 'serverFailedToReturnResolverData',
          });
        }
      }
    }

    if (action.type === 'userRequestedRelatedEventData') {
      if (typeof context !== 'undefined') {
        const response: Map<ResolverEvent, RelatedEventDataEntry> = new Map();
        for await (const results of getEachRelatedEventsResult(
          [action.payload],
          context.services.http.get
        )) {
          /**
           * results here will take the shape of
           * [event requested , response of event against the /related api]
           */
          const [baseEvent, apiResults] = results;
          if (apiResults === 'error') {
            api.dispatch({
              type: 'serverFailedToReturnRelatedEventData',
              payload: results[0],
            });
            // eslint-disable-next-line no-continue
            continue;
          }

          const fetchedResults = apiResults.events;
          // pack up the results into response
          const relatedEventEntry = fetchedResults.map((relatedEvent) => {
            return {
              relatedEvent,
              relatedEventType: event.eventType(relatedEvent),
            };
          });

          response.set(baseEvent, { relatedEvents: relatedEventEntry });
        }

        api.dispatch({
          type: 'serverReturnedRelatedEventData',
          payload: response,
        });
      }
    }
  };
};
