/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { Dispatch, MiddlewareAPI } from 'redux';
import { ResolverState, ResolverAction } from '../types';

type MiddlewareFactory<S = ResolverState> = (
  coreStart: CoreStart
) => (
  api: MiddlewareAPI<Dispatch<ResolverAction>, S>
) => (next: Dispatch<ResolverAction>) => (action: ResolverAction) => unknown;

export const resolverMiddlewareFactory: MiddlewareFactory = coreStart => {
  return api => next => async (action: ResolverAction) => {
    next(action);
    if (action.type === 'userChangedSelectedEvent') {
      // this is brittle as it is going to change assumedly.
      api.dispatch({ type: 'appRequestedResolverData' });
      const {
        coreStart: { http },
      } = coreStart;
      //const uniquePid = action.payload.selectedEvent?.value?.source.endgame.data.pid;
      const uniquePid = '3096';
      const { lifecycle } = await http.get(`/api/endpoint/resolver/${uniquePid}`, {
        query: { legacyEndpointID: '5f78bf8f-ddee-4890-ad61-6b5182309639' },
      });
      const { children } = await http.get(`/api/endpoint/resolver/${uniquePid}/children`, {
        query: { legacyEndpointID: '5f78bf8f-ddee-4890-ad61-6b5182309639' },
      });
      const { events: relatedEvents } = await http.get(
        `/api/endpoint/resolver/${uniquePid}/related`,
        {
          query: { legacyEndpointID: '5f78bf8f-ddee-4890-ad61-6b5182309639' },
        }
      );
      const response = [...lifecycle, ...children, ...relatedEvents];
      api.dispatch({
        type: 'serverReturnedResolverData',
        payload: { data: { result: { search_results: response } } },
      });
    }
  };
};
