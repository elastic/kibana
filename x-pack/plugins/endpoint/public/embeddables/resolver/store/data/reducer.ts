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
  RelatedEventData,
  waitingForRelatedEventData,
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
  } else if (action.type === 'userRequestedRelatedEventData') {
    const resolverEvent = action.payload;
    const statsMap = state[resultsEnrichedWithRelatedEventInfo];
    if (statsMap) {
      const currentStatsMap = new Map(statsMap);
      /**
       * Set the waiting indicator for this event to indicate that related event results are pending.
       * It will be replaced by the actual results from the API when they are returned.
       */
      currentStatsMap.set(resolverEvent, waitingForRelatedEventData);
      return { ...state, [resultsEnrichedWithRelatedEventInfo]: currentStatsMap };
    }
    return state;
  } else if (action.type === 'serverFailedToReturnRelatedEventData') {
    const statsMap = state[resultsEnrichedWithRelatedEventInfo];
    if (statsMap) {
      const currentStatsMap = new Map(statsMap);
      const [resolverEvent, apiError] = action.payload;
      currentStatsMap.set(resolverEvent, apiError);
      return { ...state, [resultsEnrichedWithRelatedEventInfo]: currentStatsMap };
    }
    return state;
  } else if (action.type === 'serverReturnedRelatedEventData') {
    /**
     * REMOVE: pending resolution of https://github.com/elastic/endpoint-app-team/issues/379
     * When this data is inlined with results, there won't be a need for this.
     */
    const statsMap = state[resultsEnrichedWithRelatedEventInfo];

    if (statsMap && typeof statsMap?.set === 'function') {
      const currentStatsMap: RelatedEventData = new Map(statsMap);
      for (const updatedEvent of action.payload.keys()) {
        const newStatsEntry = action.payload.get(updatedEvent);

        if (newStatsEntry) {
          // do stats
          const statsForEntry = newStatsEntry?.relatedEvents.reduce(
            (
              compiledStats: Partial<Record<RelatedEventType, number>>,
              relatedEvent: { relatedEventType: RelatedEventType }
            ) => {
              compiledStats[relatedEvent.relatedEventType] =
                (compiledStats[relatedEvent.relatedEventType] || 0) + 1;
              return compiledStats;
            },
            {}
          );
          const newRelatedEventStats: RelatedEventDataEntryWithStats = Object.assign(
            newStatsEntry,
            { stats: statsForEntry }
          );
          currentStatsMap.set(updatedEvent, newRelatedEventStats);
        }
      }
      return { ...state, [resultsEnrichedWithRelatedEventInfo]: currentStatsMap };
    }
    return state;
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
