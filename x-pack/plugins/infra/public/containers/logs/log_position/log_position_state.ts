/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import createContainer from 'constate';
import { TimeKey } from '../../../../common/time';
import { datemathToEpochMillis, isValidDatemath } from '../../../utils/datemath';

type TimeKeyOrNull = TimeKey | null;

interface DateRange {
  startDate: string;
  endDate: string;
}

interface VisiblePositions {
  startKey: TimeKeyOrNull;
  middleKey: TimeKeyOrNull;
  endKey: TimeKeyOrNull;
  pagesAfterEnd: number;
  pagesBeforeStart: number;
}

export interface LogPositionStateParams {
  initialized: boolean;
  targetPosition: TimeKeyOrNull;
  isStreaming: boolean;
  liveStreamingInterval: number;
  firstVisiblePosition: TimeKeyOrNull;
  pagesBeforeStart: number;
  pagesAfterEnd: number;
  visibleMidpoint: TimeKeyOrNull;
  visibleMidpointTime: number | null;
  visibleTimeInterval: { start: number; end: number } | null;
  startDate: string;
  endDate: string;
  startTimestamp: number | null;
  endTimestamp: number | null;
}

export interface LogPositionCallbacks {
  initialize: () => void;
  jumpToTargetPosition: (pos: TimeKeyOrNull) => void;
  jumpToTargetPositionTime: (time: number) => void;
  reportVisiblePositions: (visPos: VisiblePositions) => void;
  setLiveStreamingInterval: (interval: number) => void;
  startLiveStreaming: () => void;
  stopLiveStreaming: () => void;
  updateDateRange: (newDateRage: Partial<DateRange>) => void;
  updateTimestamps: () => void;
}

const DEFAULT_DATE_RANGE: DateRange = { startDate: 'now-1d', endDate: 'now' };

const useVisibleMidpoint = (middleKey: TimeKeyOrNull, targetPosition: TimeKeyOrNull) => {
  // Of the two dependencies `middleKey` and `targetPosition`, return
  // whichever one was the most recently updated. This allows the UI controls
  // to display a newly-selected `targetPosition` before loading new data;
  // otherwise the previous `middleKey` would linger in the UI for the entirety
  // of the loading operation, which the user could perceive as unresponsiveness
  const [store, update] = useState({
    middleKey,
    targetPosition,
    currentValue: middleKey || targetPosition,
  });
  useEffect(() => {
    if (middleKey !== store.middleKey) {
      update({ targetPosition, middleKey, currentValue: middleKey });
    } else if (targetPosition !== store.targetPosition) {
      update({ targetPosition, middleKey, currentValue: targetPosition });
    }
  }, [middleKey, targetPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  return store.currentValue;
};

export const useLogPositionState: () => LogPositionStateParams & LogPositionCallbacks = () => {
  // Flag to determine if `LogPositionState` has been fully initialized.
  //
  // When the page loads, there might be initial state in the URL. We want to
  // prevent the entries from showing until we have processed that initial
  // state. That prevents double fetching.
  const [initialized, setInitialized] = useState<boolean>(false);
  const initialize = useCallback(() => {
    setInitialized(true);
  }, [setInitialized]);

  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const updateTimestamps = useCallback(() => {
    setLastUpdate(Date.now());
  }, [setLastUpdate]);

  const [targetPosition, jumpToTargetPosition] = useState<TimeKey | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveStreamingInterval, setLiveStreamingInterval] = useState(10000);
  const [visiblePositions, reportVisiblePositions] = useState<VisiblePositions>({
    endKey: null,
    middleKey: null,
    startKey: null,
    pagesBeforeStart: Infinity,
    pagesAfterEnd: Infinity,
  });

  // We group the `startDate` and `endDate` values in the same object to be able
  // to set both at the same time, saving a re-render
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);

  const { startKey, middleKey, endKey, pagesBeforeStart, pagesAfterEnd } = visiblePositions;

  const visibleMidpoint = useVisibleMidpoint(middleKey, targetPosition);

  const visibleTimeInterval = useMemo(
    () => (startKey && endKey ? { start: startKey.time, end: endKey.time } : null),
    [startKey, endKey]
  );

  // Allow setting `startDate` and `endDate` separately, or together
  const updateDateRange = useCallback(
    (newDateRange: Partial<DateRange>) => {
      // Prevent unnecessary re-renders
      if (!('startDate' in newDateRange) && !('endDate' in newDateRange)) {
        return;
      }
      if (
        newDateRange.startDate === dateRange.startDate &&
        newDateRange.endDate === dateRange.endDate
      ) {
        return;
      }

      const nextStartDate = newDateRange.startDate || dateRange.startDate;
      const nextEndDate = newDateRange.endDate || dateRange.endDate;

      if (!isValidDatemath(nextStartDate) || !isValidDatemath(nextEndDate)) {
        return;
      }

      // Dates are valid, so the function cannot return `null`
      const nextStartTimestamp = datemathToEpochMillis(nextStartDate)!;
      const nextEndTimestamp = datemathToEpochMillis(nextEndDate, 'up')!;

      // Reset the target position if it doesn't fall within the new range.
      if (
        targetPosition &&
        (nextStartTimestamp > targetPosition.time || nextEndTimestamp < targetPosition.time)
      ) {
        jumpToTargetPosition(null);
      }

      setDateRange(previousDateRange => {
        return {
          startDate: newDateRange.startDate || previousDateRange.startDate,
          endDate: newDateRange.endDate || previousDateRange.endDate,
        };
      });
    },
    [dateRange, targetPosition]
  );

  // `lastUpdate` needs to be a dependency for the timestamps.
  // ESLint complains it's unnecessary, but we know better.
  /* eslint-disable react-hooks/exhaustive-deps */
  const startTimestamp = useMemo(() => datemathToEpochMillis(dateRange.startDate), [
    dateRange.startDate,
    lastUpdate,
  ]);

  // endTimestamp needs to be synced to `now` to allow auto-streaming
  const endTimestampDep = dateRange.endDate === 'now' ? Date.now() : dateRange.endDate;
  const endTimestamp = useMemo(() => datemathToEpochMillis(dateRange.endDate, 'up'), [
    endTimestampDep,
    lastUpdate,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const state = {
    initialized,
    targetPosition,
    isStreaming,
    firstVisiblePosition: startKey,
    pagesBeforeStart,
    pagesAfterEnd,
    visibleMidpoint,
    visibleMidpointTime: visibleMidpoint ? visibleMidpoint.time : null,
    visibleTimeInterval,
    ...dateRange,
    startTimestamp,
    endTimestamp,
    liveStreamingInterval,
  };

  const callbacks = {
    initialize,
    jumpToTargetPosition,
    jumpToTargetPositionTime: useCallback(
      (time: number) => jumpToTargetPosition({ tiebreaker: 0, time }),
      [jumpToTargetPosition]
    ),
    reportVisiblePositions,
    startLiveStreaming: useCallback(() => setIsStreaming(true), [setIsStreaming]),
    stopLiveStreaming: useCallback(() => setIsStreaming(false), [setIsStreaming]),
    updateDateRange,
    setLiveStreamingInterval,
    updateTimestamps,
  };

  return { ...state, ...callbacks };
};

export const LogPositionState = createContainer(useLogPositionState);
