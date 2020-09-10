/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { DataState } from '../../types';
import { ResolverAction } from '../actions';
import * as treeFetcherParameters from '../../models/tree_fetcher_parameters';

const initialState: DataState = {
  relatedEvents: new Map(),
  relatedEventsReady: new Map(),
  resolverComponentInstanceID: undefined,
  tree: {},
};

export const dataReducer: Reducer<DataState, ResolverAction> = (state = initialState, action) => {
  if (action.type === 'appReceivedNewExternalProperties') {
    const nextState: DataState = {
      ...state,
      tree: {
        ...state.tree,
        currentParameters: {
          databaseDocumentID: action.payload.databaseDocumentID,
          indices: action.payload.indices,
        },
      },
      resolverComponentInstanceID: action.payload.resolverComponentInstanceID,
    };
    return nextState;
  } else if (action.type === 'appRequestedResolverData') {
    // keep track of what we're requesting, this way we know when to request and when not to.
    const nextState: DataState = {
      ...state,
      tree: {
        ...state.tree,
        pendingRequestParameters: {
          databaseDocumentID: action.payload.databaseDocumentID,
          indices: action.payload.indices,
        },
      },
    };
    return nextState;
  } else if (action.type === 'appAbortedResolverDataRequest') {
    if (treeFetcherParameters.equal(action.payload, state.tree.pendingRequestParameters)) {
      // the request we were awaiting was aborted
      const nextState: DataState = {
        ...state,
        tree: {
          ...state.tree,
          pendingRequestParameters: undefined,
        },
      };
      return nextState;
    } else {
      return state;
    }
  } else if (action.type === 'serverReturnedResolverData') {
    /** Only handle this if we are expecting a response */
    const nextState: DataState = {
      ...state,

      tree: {
        ...state.tree,
        /**
         * Store the last received data, as well as the databaseDocumentID it relates to.
         */
        lastResponse: {
          result: action.payload.result,
          parameters: action.payload.parameters,
          successful: true,
        },

        // This assumes that if we just received something, there is no longer a pending request.
        // This cannot model multiple in-flight requests
        pendingRequestParameters: undefined,
      },
    };
    return nextState;
  } else if (action.type === 'serverFailedToReturnResolverData') {
    /** Only handle this if we are expecting a response */
    if (state.tree.pendingRequestParameters !== undefined) {
      const nextState: DataState = {
        ...state,
        tree: {
          ...state.tree,
          pendingRequestParameters: undefined,
          lastResponse: {
            parameters: state.tree.pendingRequestParameters,
            successful: false,
          },
        },
      };
      return nextState;
    } else {
      return state;
    }
  } else if (
    action.type === 'userRequestedRelatedEventData' ||
    action.type === 'appDetectedMissingEventData'
  ) {
    const nextState: DataState = {
      ...state,
      relatedEventsReady: new Map([...state.relatedEventsReady, [action.payload, false]]),
    };
    return nextState;
  } else if (action.type === 'serverReturnedRelatedEventData') {
    const nextState: DataState = {
      ...state,
      relatedEventsReady: new Map([...state.relatedEventsReady, [action.payload.entityID, true]]),
      relatedEvents: new Map([...state.relatedEvents, [action.payload.entityID, action.payload]]),
    };
    return nextState;
  } else {
    return state;
  }
};
