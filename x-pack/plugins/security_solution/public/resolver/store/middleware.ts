/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { KibanaReactContextValue } from '../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../types';
import { ResolverState, ResolverAction } from '../types';
import {
  ResolverEvent,
  ResolverChildren,
  ResolverAncestry,
  LifecycleNode,
  ResolverNodeStats,
  ResolverRelatedEvents,
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
          let entityId: string;
          let stats: ResolverNodeStats;
          if (event.isLegacyEvent(action.payload.selectedEvent)) {
            entityId = action.payload.selectedEvent?.endgame?.unique_pid.toString();
            const legacyEndpointID = action.payload.selectedEvent?.agent?.id;
            [{ lifecycle, children, ancestry, stats }] = await Promise.all([
              context.services.http.get(`/api/endpoint/resolver/${entityId}`, {
                query: { legacyEndpointID, children: 5, ancestors: 5 },
              }),
            ]);
          } else {
            entityId = action.payload.selectedEvent.process.entity_id;
            [{ lifecycle, children, ancestry, stats }] = await Promise.all([
              context.services.http.get(`/api/endpoint/resolver/${entityId}`, {
                query: {
                  children: 5,
                  ancestors: 5,
                },
              }),
            ]);
          }
          const nodeStats: Map<string, ResolverNodeStats> = new Map();
          nodeStats.set(entityId, stats);
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
    } else if (
      (action.type === 'userRequestedRelatedEventData' ||
        action.type === 'appDetectedMissingEventData') &&
      context
    ) {
      const entityIdToFetchFor = action.payload;
      let result: ResolverRelatedEvents;
      try {
        result = await context.services.http.get(
          `/api/endpoint/resolver/${entityIdToFetchFor}/events`,
          {
            query: { events: 100 },
          }
        );

        api.dispatch({
          type: 'serverReturnedRelatedEventData',
          payload: result,
        });
      } catch (e) {
        api.dispatch({
          type: 'serverFailedToReturnRelatedEventData',
          payload: action.payload,
        });
      }
    }
  };
};
