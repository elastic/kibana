/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-duplicate-imports */

import { Dispatch, MiddlewareAPI } from 'redux';
import { ResolverTree, ResolverEntityIndex } from '../../../../common/endpoint/types';

import { KibanaReactContextValue } from '../../../../../../../src/plugins/kibana_react/public';
import { ResolverState } from '../../types';
import * as selectors from '../selectors';
import { StartServices } from '../../../types';
import { DEFAULT_INDEX_KEY as defaultIndexKey } from '../../../../common/constants';
import { ResolverAction } from '../actions';
/**
 * A function that handles syncing ResolverTree data w/ the current entity ID.
 * This will make a request anytime the entityID changes (to something other than undefined.)
 * If the entity ID changes while a request is in progress, the in-progress request will be cancelled.
 * Call the returned function after each state transition.
 * This is a factory because it is stateful and keeps that state in closure.
 */
export function ResolverTreeFetcher(
  context: KibanaReactContextValue<StartServices>,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  let lastRequestAbortController: AbortController | undefined;

  // Call this after each state change.
  // This fetches the ResolverTree for the current entityID
  // if the entityID changes while
  return async () => {
    const state = api.getState();
    const databaseDocumentIDToFetch = selectors.databaseDocumentIDToFetch(state);

    if (selectors.databaseDocumentIDToAbort(state) && lastRequestAbortController) {
      lastRequestAbortController.abort();
      // calling abort will cause an action to be fired
    } else if (databaseDocumentIDToFetch !== null) {
      lastRequestAbortController = new AbortController();
      let result: ResolverTree | undefined;
      // Inform the state that we've made the request. Without this, the middleware will try to make the request again
      // immediately.
      api.dispatch({
        type: 'appRequestedResolverData',
        payload: databaseDocumentIDToFetch,
      });
      try {
        const indices: string[] = context.services.uiSettings.get(defaultIndexKey);
        const matchingEntities: ResolverEntityIndex = await context.services.http.get(
          '/api/endpoint/resolver/entity',
          {
            signal: lastRequestAbortController.signal,
            query: {
              _id: databaseDocumentIDToFetch,
              indices,
            },
          }
        );
        if (matchingEntities.length < 1) {
          // If no entity_id could be found for the _id, bail out with a failure.
          api.dispatch({
            type: 'serverFailedToReturnResolverData',
            payload: databaseDocumentIDToFetch,
          });
          return;
        }
        const entityIDToFetch = matchingEntities[0].entity_id;
        result = await context.services.http.get(`/api/endpoint/resolver/${entityIDToFetch}`, {
          signal: lastRequestAbortController.signal,
        });
      } catch (error) {
        // https://developer.mozilla.org/en-US/docs/Web/API/DOMException#exception-AbortError
        if (error instanceof DOMException && error.name === 'AbortError') {
          api.dispatch({
            type: 'appAbortedResolverDataRequest',
            payload: databaseDocumentIDToFetch,
          });
        } else {
          api.dispatch({
            type: 'serverFailedToReturnResolverData',
            payload: databaseDocumentIDToFetch,
          });
        }
      }
      if (result !== undefined) {
        api.dispatch({
          type: 'serverReturnedResolverData',
          payload: {
            result,
            databaseDocumentID: databaseDocumentIDToFetch,
          },
        });
      }
    }
  };
}
