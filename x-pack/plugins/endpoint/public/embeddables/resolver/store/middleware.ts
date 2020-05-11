/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { HttpHandler } from 'kibana/public';
import { KibanaReactContextValue } from '../../../../../../../src/plugins/kibana_react/public';
import { EndpointPluginServices } from '../../../plugin';
import { ResolverState, ResolverAction, RelatedEventDataEntry, RelatedEventType } from '../types';
import { ResolverEvent, ResolverNode } from '../../../../common/types';
import * as event from '../../../../common/models/event';

type MiddlewareFactory<S = ResolverState> = (
  context?: KibanaReactContextValue<EndpointPluginServices>
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

function flattenEvents(children: ResolverNode[], events: ResolverEvent[] = []): ResolverEvent[] {
  return children.reduce((flattenedEvents, currentNode) => {
    if (currentNode.lifecycle && currentNode.lifecycle.length > 0) {
      flattenedEvents.push(...currentNode.lifecycle);
    }
    if (currentNode.children && currentNode.children.length > 0) {
      return flattenEvents(currentNode.children, events);
    } else {
      return flattenedEvents;
    }
  }, events);
}

type RelatedEventAPIResponse = Error | { events: ResolverEvent[] };
async function* getEachRelatedEventsResult(
  eventsToFetch: ResolverEvent[],
  httpGetter: HttpHandler
): AsyncGenerator<[ResolverEvent, RelatedEventAPIResponse]> {
  for (const eventToQueryForRelateds of eventsToFetch) {
    const id = event.entityId(eventToQueryForRelateds);
    const relatedEventError = new Error(`Error fetching related events for entity=${id}`);
    let result: RelatedEventAPIResponse = relatedEventError;
    try {
      result = await httpGetter(`/api/endpoint/resolver/${id}/events`, {
        query: { events: 100 },
      });
    } catch (e) {
      result = relatedEventError;
    }
    yield [eventToQueryForRelateds, result];
  }
}

export const resolverMiddlewareFactory: MiddlewareFactory = context => {
  return api => next => async (action: ResolverAction) => {
    next(action);
    if (action.type === 'userChangedSelectedEvent') {
      /**
       * concurrently fetches a process's details, its ancestors, and its related events.
       */
      if (context?.services.http && action.payload.selectedEvent) {
        api.dispatch({ type: 'appRequestedResolverData' });
        try {
          let lifecycle: ResolverEvent[];
          let children: ResolverNode[];
          let ancestors: ResolverNode[];
          if (event.isLegacyEvent(action.payload.selectedEvent)) {
            const entityId = action.payload.selectedEvent?.endgame?.unique_pid;
            const legacyEndpointID = action.payload.selectedEvent?.agent?.id;
            [{ lifecycle, children, ancestors }] = await Promise.all([
              context.services.http.get(`/api/endpoint/resolver/${entityId}`, {
                query: { legacyEndpointID, children: 5, ancestors: 5 },
              }),
            ]);
          } else {
            const entityId = action.payload.selectedEvent.process.entity_id;
            [{ lifecycle, children, ancestors }] = await Promise.all([
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
            ...flattenEvents(children),
            ...flattenEvents(ancestors),
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
        for await (const results of getEachRelatedEventsResult(
          [action.payload],
          context.services.http.get
        )) {
          const apiResults = results[1];
          if (apiResults instanceof Error) {
            api.dispatch({
              type: 'serverFailedToReturnRelatedEventData',
              payload: [results[0], apiResults],
            });
          }
          const response: Map<ResolverEvent, RelatedEventDataEntry> = new Map();
          const baseEvent = results[0];
          const fetchedResults = (results[1] as { events: ResolverEvent[] }).events;
          // pack up the results into response
          const relatedEventEntry = fetchedResults.map(relatedEvent => {
            return {
              relatedEvent,
              relatedEventType: event.eventCategoryDisplayName(relatedEvent) as RelatedEventType,
            };
          });

          response.set(baseEvent, { relatedEvents: relatedEventEntry });

          api.dispatch({
            type: 'serverReturnedRelatedEventData',
            payload: response,
          });
        }
      }
    }
  };
};
