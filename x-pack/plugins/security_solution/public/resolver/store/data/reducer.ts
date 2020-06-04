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
    isLoading: false,
    hasError: false,
    resultsEnrichedWithRelatedEventInfo: new Map(),
  };
}

export const dataReducer: Reducer<DataState, ResolverAction> = (state = initialState(), action) => {
  if (action.type === 'serverReturnedResolverData') {
    return {
      ...state,
      results: action.payload,
      isLoading: false,
      hasError: false,
    };
  } else if (action.type === 'userRequestedRelatedEventData') {
    const resolverEvent = action.payload;
    const currentStatsMap = new Map(state.resultsEnrichedWithRelatedEventInfo);
    /**
     * Set the waiting indicator for this event to indicate that related event results are pending.
     * It will be replaced by the actual results from the API when they are returned.
     */
    currentStatsMap.set(resolverEvent, 'waitingForRelatedEventData');
    return { ...state, resultsEnrichedWithRelatedEventInfo: currentStatsMap };
  } else if (action.type === 'serverFailedToReturnRelatedEventData') {
    const currentStatsMap = new Map(state.resultsEnrichedWithRelatedEventInfo);
    const resolverEvent = action.payload;
    currentStatsMap.set(resolverEvent, 'error');
    return { ...state, resultsEnrichedWithRelatedEventInfo: currentStatsMap };
  } else if (action.type === 'serverReturnedRelatedEventData') {
    const relatedDataEntries = new Map([
      ...state.resultsEnrichedWithRelatedEventInfo,
      ...action.payload,
    ]);
    return { ...state, resultsEnrichedWithRelatedEventInfo: relatedDataEntries };
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
  } else {
    return state;
  }
};
