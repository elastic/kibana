/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { KibanaReactContextValue } from '../../../../../../../src/plugins/kibana_react/public';
import { EndpointPluginServices } from '../../../plugin';
import { ResolverState, ResolverAction } from '../types';
import { ResolverEvent, Node } from '../../../../common/types';
import * as event from '../../../../common/models/event';

type MiddlewareFactory<S = ResolverState> = (
  context?: KibanaReactContextValue<EndpointPluginServices>
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

function flattenEvents(children: Node[], events: ResolverEvent[] = []): ResolverEvent[] {
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
          let children: Node[];
          let ancestors: Node[];
          if (event.isLegacyEvent(action.payload.selectedEvent)) {
            const entityId = action.payload.selectedEvent?.endgame?.unique_pid;
            const legacyEndpointID = action.payload.selectedEvent?.agent?.id;
            [{ lifecycle, children, ancestors }] = await Promise.all([
              context.services.http.get(`/api/endpoint/resolver/${entityId}`, {
                query: { legacyEndpointID },
              }),
            ]);
          } else {
            const entityId = action.payload.selectedEvent.process.entity_id;
            [{ lifecycle, children, ancestors }] = await Promise.all([
              context.services.http.get(`/api/endpoint/resolver/${entityId}`),
            ]);
          }
          const response: ResolverEvent[] = [
            ...lifecycle,
            ...flattenEvents(children),
            ...flattenEvents(ancestors),
          ];
          api.dispatch({
            type: 'serverReturnedResolverData',
            payload: { data: { result: { search_results: response } } },
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
