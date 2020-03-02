/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { KibanaReactContextValue } from '../../../../../../../src/plugins/kibana_react/public';
import { EndpointPluginServices } from '../../../plugin';
import { ResolverState, ResolverAction } from '../types';

type MiddlewareFactory<S = ResolverState> = (
  context?: KibanaReactContextValue<EndpointPluginServices>
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

export const resolverMiddlewareFactory: MiddlewareFactory = context => {
  return api => next => async (action: ResolverAction) => {
    next(action);
    if (action.type === 'userChangedSelectedEvent') {
      if (context?.services.http) {
        api.dispatch({ type: 'appRequestedResolverData' });
        const uniquePid = action.payload.selectedEvent?.endgame?.unique_pid;
        const legacyEndpointID = action.payload.selectedEvent?.agent?.id;
        const [{ lifecycle }, { children }, { events: relatedEvents }] = await Promise.all([
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
        const response = [...lifecycle, ...children, ...relatedEvents];
        api.dispatch({
          type: 'serverReturnedResolverData',
          payload: { data: { result: { search_results: response } } },
        });
      }
    }
  };
};
