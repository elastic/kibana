/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { DataState } from '../../types';
import { ResolverAction } from '../actions';
import * as databaseParameters from '../../models/database_parameters';

const initialState: DataState = {
  relatedEvents: new Map(),
  relatedEventsReady: new Map(),
  resolverComponentInstanceID: undefined,
};

export const dataReducer: Reducer<DataState, ResolverAction> = (state = initialState, action) => {
  if (action.type === 'appReceivedNewExternalProperties') {
    const nextState: DataState = {
      ...state,
      currentParameters: {
        databaseDocumentID: action.payload.databaseDocumentID,
        indices: action.payload.indices,
      },
      resolverComponentInstanceID: action.payload.resolverComponentInstanceID,
    };
    return nextState;
  } else if (action.type === 'appRequestedResolverData') {
    // keep track of what we're requesting, this way we know when to request and when not to.
    return {
      ...state,
      pendingRequestParameters: {
        databaseDocumentID: action.payload.databaseDocumentID,
        indices: action.payload.indices,
      },
    };
  } else if (action.type === 'appAbortedResolverDataRequest') {
    if (databaseParameters.equal(action.payload, state.pendingRequestParameters)) {
      // the request we were awaiting was aborted
      return {
        ...state,
        pendingRequestParameters: undefined,
      };
    } else {
      return state;
    }
  } else if (action.type === 'serverReturnedResolverData') {
    /** Only handle this if we are expecting a response */
    const nextState: DataState = {
      ...state,

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
    };
    return nextState;
  } else if (action.type === 'serverFailedToReturnResolverData') {
    /** Only handle this if we are expecting a response */
    if (state.pendingRequestParameters !== undefined) {
      const nextState: DataState = {
        ...state,
        pendingRequestParameters: undefined,
        lastResponse: {
          parameters: state.pendingRequestParameters,
          successful: false,
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
    return {
      ...state,
      relatedEventsReady: new Map([...state.relatedEventsReady, [action.payload, false]]),
    };
  } else if (action.type === 'serverReturnedRelatedEventData') {
    return {
      ...state,
      relatedEventsReady: new Map([...state.relatedEventsReady, [action.payload.entityID, true]]),
      relatedEvents: new Map([...state.relatedEvents, [action.payload.entityID, action.payload]]),
    };
  } else {
    return state;
  }
};
