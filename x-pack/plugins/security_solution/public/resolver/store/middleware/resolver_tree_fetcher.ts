/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { ResolverTree, ResolverEntityIndex } from '../../../../common/endpoint/types';

import { ResolverState, DataAccessLayer } from '../../types';
import * as selectors from '../selectors';
import { ResolverAction } from '../actions';
/**
 * A function that handles syncing ResolverTree data w/ the current entity ID.
 * This will make a request anytime the entityID changes (to something other than undefined.)
 * If the entity ID changes while a request is in progress, the in-progress request will be cancelled.
 * Call the returned function after each state transition.
 * This is a factory because it is stateful and keeps that state in closure.
 */
export function ResolverTreeFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  let lastRequestAbortController: AbortController | undefined;

  // Call this after each state change.
  // This fetches the ResolverTree for the current entityID
  // if the entityID changes while
  return async () => {
    const state = api.getState();
    let databaseParameters;
    const shouldRefetch = selectors.resolverDataIsStale(state);
    console.log('should refetch', shouldRefetch);
    if (shouldRefetch) {
      databaseParameters = selectors.lastResponseParameters(state);
    } else {
      databaseParameters = selectors.treeParametersToFetch(state);
    }
    if (selectors.treeRequestParametersToAbort(state) && lastRequestAbortController) {
      lastRequestAbortController.abort();
      // calling abort will cause an action to be fired
    } else if (databaseParameters !== null) {
      lastRequestAbortController = new AbortController();
      let result: ResolverTree | undefined;
      // Inform the state that we've made the request. Without this, the middleware will try to make the request again
      // immediately.
      databaseParameters.dataRequestID = state.data.dataInvalidatedCount;
      api.dispatch({
        type: 'appRequestedResolverData',
        payload: databaseParameters,
      });
      try {
        const matchingEntities: ResolverEntityIndex = await dataAccessLayer.entities({
          _id: databaseParameters.databaseDocumentID,
          indices: databaseParameters.indices ?? [],
          signal: lastRequestAbortController.signal,
        });
        if (matchingEntities.length < 1) {
          // If no entity_id could be found for the _id, bail out with a failure.
          api.dispatch({
            type: 'serverFailedToReturnResolverData',
            payload: databaseParameters,
          });
          return;
        }
        const entityIDToFetch = matchingEntities[0].entity_id;
        result = await dataAccessLayer.resolverTree(
          entityIDToFetch,
          lastRequestAbortController.signal
        );
      } catch (error) {
        // https://developer.mozilla.org/en-US/docs/Web/API/DOMException#exception-AbortError
        if (error instanceof DOMException && error.name === 'AbortError') {
          api.dispatch({
            type: 'appAbortedResolverDataRequest',
            payload: databaseParameters,
          });
        } else {
          api.dispatch({
            type: 'serverFailedToReturnResolverData',
            payload: databaseParameters,
          });
        }
      }
      if (result !== undefined) {
        api.dispatch({
          type: 'serverReturnedResolverData',
          payload: {
            result,
            parameters: databaseParameters,
          },
        });
      }
    }
  };
}
