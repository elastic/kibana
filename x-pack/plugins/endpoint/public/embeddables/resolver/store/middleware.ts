/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { KibanaReactContextValue } from '../../../../../../../src/plugins/kibana_react/public';
import { EndpointPluginServices } from '../../../plugin';
import { ResolverState, ResolverAction } from '../types';
import { isLegacyEvent, ResolverEvent } from '../../../../common/types';

type MiddlewareFactory<S = ResolverState> = (
  context?: KibanaReactContextValue<EndpointPluginServices>
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

export const resolverMiddlewareFactory: MiddlewareFactory = context => {
  return api => next => async (action: ResolverAction) => {
    next(action);
    if (action.type === 'userChangedSelectedEvent') {
      if (context?.services.http && action.payload.selectedEvent) {
        api.dispatch({ type: 'appRequestedResolverData' });
        let response = [];
        let lifecycle: ResolverEvent[];
        let childEvents: ResolverEvent[];
        let relatedEvents: ResolverEvent[];
        const ancestors: ResolverEvent[] = [];
        const maxAncestors = 5;
        if (isLegacyEvent(action.payload.selectedEvent)) {
          const uniquePid = action.payload.selectedEvent?.endgame?.unique_pid;
          const legacyEndpointID = action.payload.selectedEvent?.agent?.id;
          [
            { lifecycle },
            {
              children: [{ lifecycle: childEvents }],
            },
            { events: relatedEvents },
          ] = await Promise.all([
            context.services.http.get(`/api/endpoint/resolver/${uniquePid}`, {
              query: { legacyEndpointID },
            }),
            context.services.http.get(`/api/endpoint/resolver/${uniquePid}/children`, {
              query: { legacyEndpointID },
            }),
            context.services.http.get(`/api/endpoint/resolver/${uniquePid}/related`, {
              query: { legacyEndpointID },
            }),
          ]);
        } else {
          const uniquePid = action.payload.selectedEvent.endpoint.process.entity_id;
          const ppid = action.payload.selectedEvent.endpoint.process.parent?.entity_id;
          async function getAncestors(pid: string | undefined) {
            if (ancestors.length < maxAncestors && pid !== undefined) {
              const parent = await context?.services.http.get(`/api/endpoint/resolver/${pid}`);
              ancestors.push(parent.lifecycle[0]);
              if (parent.lifecycle[0].endpoint?.process?.parent?.entity_id) {
                await getAncestors(parent.lifecycle[0].endpoint.process.parent.entity_id);
              }
            }
          }
          [
            { lifecycle },
            {
              children: [{ lifecycle: childEvents }],
            },
            { events: relatedEvents },
          ] = await Promise.all([
            context.services.http.get(`/api/endpoint/resolver/${uniquePid}`),
            context.services.http.get(`/api/endpoint/resolver/${uniquePid}/children`),
            context.services.http.get(`/api/endpoint/resolver/${uniquePid}/related`),
            getAncestors(ppid),
          ]);
        }

        response = [...lifecycle, ...childEvents, ...relatedEvents, ...ancestors];
        api.dispatch({
          type: 'serverReturnedResolverData',
          payload: { data: { result: { search_results: response } } },
        });
      }
    }
  };
};
