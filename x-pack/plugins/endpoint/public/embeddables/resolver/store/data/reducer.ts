/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import {
  DataState,
  ResolverAction,
  resultsEnrichedWithRelatedEventInfo,
  RelatedEventDataEntryWithStats,
  RelatedEventType,
} from '../../types';

function initialState(): DataState {
  return {
    results: [],
    isLoading: false,
    hasError: false,
    [resultsEnrichedWithRelatedEventInfo]: new Map(),
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
  } else if (action.type === 'serverReturnedRelatedEventData') {
    /**
     * REMOVE: pending resolution of https://github.com/elastic/endpoint-app-team/issues/379
     * When this data is inlined with results, there won't be a need for this.
     */
    console.log('payload received by reducer: %o', action.payload);
    const statsMap = state[resultsEnrichedWithRelatedEventInfo];
    if (statsMap && typeof statsMap?.set === 'function') {
      for (const updatedEvent of action.payload.keys()) {
        const newStatsEntry = action.payload.get(updatedEvent);

        if (newStatsEntry) {
          // do stats
          const statsForEntry = newStatsEntry?.related_events.reduce((a: Partial<Record<RelatedEventType, number>>,v: {related_event_type: RelatedEventType})=>{ a[v.related_event_type] = (a[v.related_event_type]||0)+1; return a; },{})
          const newRelatedEventStats: RelatedEventDataEntryWithStats = Object.assign(
            newStatsEntry,
            { stats: statsForEntry }
          );
          statsMap.set(updatedEvent, newRelatedEventStats);
        }
      }
    }
    return { ...state, [resultsEnrichedWithRelatedEventInfo]: statsMap };
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
