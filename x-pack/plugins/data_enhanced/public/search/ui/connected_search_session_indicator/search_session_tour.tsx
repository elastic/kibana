/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public';
import { SearchSessionIndicatorRef } from '../search_session_indicator';
import { SearchSessionState } from '../../../../../../../src/plugins/data/public';

const TOUR_TAKING_TOO_LONG_TIMEOUT = 10000;
export const TOUR_TAKING_TOO_LONG_STEP_KEY = `data.searchSession.tour.takingTooLong`;
export const TOUR_RESTORE_STEP_KEY = `data.searchSession.tour.restore`;

export function useSearchSessionTour(
  storage: IStorageWrapper,
  searchSessionIndicatorRef: SearchSessionIndicatorRef | null,
  state: SearchSessionState,
  searchSessionsDisabled: boolean
) {
  const markOpenedDone = useCallback(() => {
    safeSet(storage, TOUR_TAKING_TOO_LONG_STEP_KEY);
  }, [storage]);

  const markRestoredDone = useCallback(() => {
    safeSet(storage, TOUR_RESTORE_STEP_KEY);
  }, [storage]);

  useEffect(() => {
    if (searchSessionsDisabled) return;
    if (!searchSessionIndicatorRef) return;
    let timeoutHandle: number;

    if (state === SearchSessionState.Loading) {
      if (!safeHas(storage, TOUR_TAKING_TOO_LONG_STEP_KEY)) {
        timeoutHandle = window.setTimeout(() => {
          searchSessionIndicatorRef.openPopover();
        }, TOUR_TAKING_TOO_LONG_TIMEOUT);
      }
    }

    if (state === SearchSessionState.Restored) {
      if (!safeHas(storage, TOUR_RESTORE_STEP_KEY)) {
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
    markOpenedDone,
    markRestoredDone,
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
