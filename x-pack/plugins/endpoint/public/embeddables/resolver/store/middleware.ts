/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { KibanaReactContextValue } from '../../../../../../../src/plugins/kibana_react/public';
import { EndpointPluginServices } from '../../../plugin';
import { ResolverState, ResolverAction, RelatedEventDataEntry, RelatedEventType } from '../types';
import { ResolverEvent, ResolverNode } from '../../../../common/types';
import * as event from '../../../../common/models/event';
import { HttpHandler } from 'kibana/public';

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

async function* getEachRelatedEventsResult(eventsToFetch: ResolverEvent[], httpGetter: HttpHandler) {
  for (const eventToQueryForRelateds of eventsToFetch){
    const id = event.entityId(eventToQueryForRelateds);
    yield [eventToQueryForRelateds, await Promise.all([
      httpGetter(`/api/endpoint/resolver/${id}/events`, {
        query: {events: 100},
      }),
    ])
    ]
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
    /**
     * REMOVE: pending resolution of https://github.com/elastic/endpoint-app-team/issues/379
     * When this data is inlined with results, there won't be a need for this.
     */
    if (action.type === 'appRequestedRelatedEventData') {
      if(typeof context !== 'undefined') { 
        for await (const results of getEachRelatedEventsResult([action.payload], context.services.http.get)){
            const response: Map<ResolverEvent, RelatedEventDataEntry> = new Map();
            const baseEvent = results[0] as unknown as ResolverEvent;
            const fetchedResults = (results[1] as unknown as {events: ResolverEvent[]}[])
              //pack up the results into response
            for (const relatedEventResult of fetchedResults) {
              //help figure out how to type the Async Generator above
              const relatedEventsFromResult = relatedEventResult.events;
              const relatedEventEntry = relatedEventsFromResult.map(related_event => {
                return {
                  related_event,
                  related_event_type: event.eventCategoryDisplayName(related_event) as RelatedEventType
                }
              })
              response.set(baseEvent, {related_events: relatedEventEntry});
            }
            api.dispatch({
              type: 'serverReturnedRelatedEventData',
              payload: response,
            });
          }
      }
    }
  };
};
