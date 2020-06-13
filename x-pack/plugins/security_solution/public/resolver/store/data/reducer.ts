/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { DataState, ResolverAction } from '../../types';

function initialState(): DataState {
  return {
    results: [],
    relatedEventsStats: new Map(),
    relatedEvents: new Map(),
    relatedEventsReady: new Map(),
    isLoading: false,
    hasError: false,
  };
}

export const dataReducer: Reducer<DataState, ResolverAction> = (state = initialState(), action) => {
  if (action.type === 'serverReturnedResolverData') {
    return {
      ...state,
      results: action.events,
      relatedEventsStats: action.stats,
      isLoading: false,
      hasError: false,
    };
  } else if (action.type === 'appRequestedResolverData') {
    return {
      ...state,
      isLoading: true,
      hasError: false,
    };
  } else if (action.type === 'serverFailedToReturnResolverData') {
    return {
      ...state,
      hasError: true,
    };
  } else if (action.type === 'userRequestedRelatedEventData') {
    state.relatedEventsReady.set(action.payload, false);
    return state;
  } else if (action.type === 'serverReturnedRelatedEventData') {
    state.relatedEventsReady.set(action.payload.entityID, true);
    state.relatedEvents.set(action.payload.entityID, action.payload);
    return state;
  } else {
    return state;
  }
};
