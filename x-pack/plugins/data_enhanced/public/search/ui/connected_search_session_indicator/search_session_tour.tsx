/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { once } from 'lodash';
import { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public';
import { SearchSessionIndicatorRef } from '../search_session_indicator';
import {
  SearchSessionState,
  SearchUsageCollector,
} from '../../../../../../../src/plugins/data/public';

const TOUR_TAKING_TOO_LONG_TIMEOUT = 10000;
export const TOUR_TAKING_TOO_LONG_STEP_KEY = `data.searchSession.tour.takingTooLong`;
export const TOUR_RESTORE_STEP_KEY = `data.searchSession.tour.restore`;

export function useSearchSessionTour(
  storage: IStorageWrapper,
  searchSessionIndicatorRef: SearchSessionIndicatorRef | null,
  state: SearchSessionState,
  searchSessionsDisabled: boolean,
  disableSearchSessionsTour: boolean,
  usageCollector?: SearchUsageCollector
) {
  const markOpenedDone = useCallback(() => {
    safeSet(storage, TOUR_TAKING_TOO_LONG_STEP_KEY);
  }, [storage]);

  const markRestoredDone = useCallback(() => {
    safeSet(storage, TOUR_RESTORE_STEP_KEY);
  }, [storage]);

  // Makes sure `trackSessionIndicatorTourLoading` is called only once per sessionId
  // if to call `usageCollector?.trackSessionIndicatorTourLoading()` directly inside the `useEffect` below
  // it might happen that we cause excessive logging
  // ESLint: React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trackSessionIndicatorTourLoading = useCallback(
    once(() => usageCollector?.trackSessionIndicatorTourLoading()),
    [usageCollector, state]
  );

  // Makes sure `trackSessionIndicatorTourRestored` is called only once per sessionId
  // if to call `usageCollector?.trackSessionIndicatorTourRestored()` directly inside the `useEffect` below
  // it might happen that we cause excessive logging
  // ESLint: React Hook useCallback received a function whose dependencies are unknown. Pass an inline function instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trackSessionIndicatorTourRestored = useCallback(
    once(() => usageCollector?.trackSessionIndicatorTourRestored()),
    [usageCollector, state]
  );

  useEffect(() => {
    if (searchSessionsDisabled) return;
    if (disableSearchSessionsTour) return;
    if (!searchSessionIndicatorRef) return;
    let timeoutHandle: number;

    if (state === SearchSessionState.Loading) {
      if (!safeHas(storage, TOUR_TAKING_TOO_LONG_STEP_KEY)) {
        timeoutHandle = window.setTimeout(() => {
          trackSessionIndicatorTourLoading();
          searchSessionIndicatorRef.openPopover();
        }, TOUR_TAKING_TOO_LONG_TIMEOUT);
      }
    }

    if (state === SearchSessionState.Restored) {
      if (!safeHas(storage, TOUR_RESTORE_STEP_KEY)) {
        trackSessionIndicatorTourRestored();
        searchSessionIndicatorRef.openPopover();
      }
    }

    return () => {
      clearTimeout(timeoutHandle);
    };
  }, [
    storage,
    searchSessionIndicatorRef,
    state,
    searchSessionsDisabled,
    disableSearchSessionsTour,
    markOpenedDone,
    markRestoredDone,
    usageCollector,
    trackSessionIndicatorTourRestored,
    trackSessionIndicatorTourLoading,
  ]);

  return {
    markOpenedDone,
    markRestoredDone,
  };
}

function safeHas(storage: IStorageWrapper, key: string): boolean {
  try {
    return Boolean(storage.get(key));
  } catch (e) {
    return true;
  }
}

function safeSet(storage: IStorageWrapper, key: string) {
  try {
    storage.set(key, true);
  } catch (e) {
    return true;
  }
}
