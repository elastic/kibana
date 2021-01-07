/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import createContainer from 'constate';
import useSetState from 'react-use/lib/useSetState';
import { TimeKey } from '../../../../common/time';
import { datemathToEpochMillis, isValidDatemath } from '../../../utils/datemath';
import { useKibanaTimefilterTime } from '../../../hooks/use_kibana_timefilter_time';

type TimeKeyOrNull = TimeKey | null;

interface DateRange {
  startDateExpression: string;
  endDateExpression: string;
  startTimestamp: number;
  endTimestamp: number;
  timestampsLastUpdate: number;
}

interface VisiblePositions {
  startKey: TimeKeyOrNull;
  middleKey: TimeKeyOrNull;
  endKey: TimeKeyOrNull;
  pagesAfterEnd: number;
  pagesBeforeStart: number;
}

export interface LogPositionStateParams {
  isInitialized: boolean;
  targetPosition: TimeKeyOrNull;
  isStreaming: boolean;
  firstVisiblePosition: TimeKeyOrNull;
  pagesBeforeStart: number;
  pagesAfterEnd: number;
  visibleMidpoint: TimeKeyOrNull;
  visibleMidpointTime: number | null;
  visibleTimeInterval: { start: number; end: number } | null;
  startDateExpression: string;
  endDateExpression: string;
  startTimestamp: number | null;
  endTimestamp: number | null;
  timestampsLastUpdate: number;
}

export interface LogPositionCallbacks {
  initialize: () => void;
  jumpToTargetPosition: (pos: TimeKeyOrNull) => void;
  jumpToTargetPositionTime: (time: number) => void;
  reportVisiblePositions: (visPos: VisiblePositions) => void;
  startLiveStreaming: () => void;
  stopLiveStreaming: () => void;
  updateDateRange: (newDateRage: Partial<DateRange>) => void;
}

const DESIRED_BUFFER_PAGES = 2;

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

const TIME_DEFAULTS = { from: 'now-1d', to: 'now' };

export const useLogPositionState: () => LogPositionStateParams & LogPositionCallbacks = () => {
  const [getTime, setTime] = useKibanaTimefilterTime(TIME_DEFAULTS);
  const { from: start, to: end } = getTime();

  const DEFAULT_DATE_RANGE = {
    startDateExpression: start,
    endDateExpression: end,
  };

  // Flag to determine if `LogPositionState` has been fully initialized.
  //
  // When the page loads, there might be initial state in the URL. We want to
  // prevent the entries from showing until we have processed that initial
  // state. That prevents double fetching.
  const [isInitialized, setInitialized] = useState<boolean>(false);
  const initialize = useCallback(() => {
    setInitialized(true);
  }, [setInitialized]);

  const [targetPosition, jumpToTargetPosition] = useState<TimeKey | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [visiblePositions, reportVisiblePositions] = useState<VisiblePositions>({
    endKey: null,
    middleKey: null,
    startKey: null,
    pagesBeforeStart: Infinity,
    pagesAfterEnd: Infinity,
  });

  // We group the `startDate` and `endDate` values in the same object to be able
  // to set both at the same time, saving a re-render
  const [dateRange, setDateRange] = useSetState<DateRange>({
    ...DEFAULT_DATE_RANGE,
    startTimestamp: datemathToEpochMillis(DEFAULT_DATE_RANGE.startDateExpression)!,
    endTimestamp: datemathToEpochMillis(DEFAULT_DATE_RANGE.endDateExpression, 'up')!,
    timestampsLastUpdate: Date.now(),
  });

  useEffect(() => {
    if (isInitialized) {
      if (
        TIME_DEFAULTS.from !== dateRange.startDateExpression ||
        TIME_DEFAULTS.to !== dateRange.endDateExpression
      ) {
        setTime({ from: dateRange.startDateExpression, to: dateRange.endDateExpression });
      }
    }
  }, [isInitialized, dateRange.startDateExpression, dateRange.endDateExpression, setTime]);

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
      if (!('startDateExpression' in newDateRange) && !('endDateExpression' in newDateRange)) {
        return;
      }

      const nextStartDateExpression =
        newDateRange.startDateExpression || dateRange.startDateExpression;
      const nextEndDateExpression = newDateRange.endDateExpression || dateRange.endDateExpression;

      if (!isValidDatemath(nextStartDateExpression) || !isValidDatemath(nextEndDateExpression)) {
        return;
      }

      // Dates are valid, so the function cannot return `null`
      const nextStartTimestamp = datemathToEpochMillis(nextStartDateExpression)!;
      const nextEndTimestamp = datemathToEpochMillis(nextEndDateExpression, 'up')!;

      // Reset the target position if it doesn't fall within the new range.
      if (
        targetPosition &&
        (nextStartTimestamp > targetPosition.time || nextEndTimestamp < targetPosition.time)
      ) {
        jumpToTargetPosition(null);
      }

      setDateRange({
        ...newDateRange,
        startTimestamp: nextStartTimestamp,
        endTimestamp: nextEndTimestamp,
        timestampsLastUpdate: Date.now(),
      });
    },
    [setDateRange, dateRange, targetPosition]
  );

  // `endTimestamp` update conditions
  useEffect(() => {
    if (dateRange.endDateExpression !== 'now') {
      return;
    }

    // User is close to the bottom edge of the scroll.
    if (visiblePositions.pagesAfterEnd <= DESIRED_BUFFER_PAGES) {
      setDateRange({
        endTimestamp: datemathToEpochMillis(dateRange.endDateExpression, 'up')!,
        timestampsLastUpdate: Date.now(),
      });
    }
  }, [dateRange.endDateExpression, visiblePositions, setDateRange]);

  const state = {
    isInitialized,
    targetPosition,
    isStreaming,
    firstVisiblePosition: startKey,
    pagesBeforeStart,
    pagesAfterEnd,
    visibleMidpoint,
    visibleMidpointTime: visibleMidpoint ? visibleMidpoint.time : null,
    visibleTimeInterval,
    ...dateRange,
  };

  const callbacks = {
    initialize,
    jumpToTargetPosition,
    jumpToTargetPositionTime: useCallback(
      (time: number) => jumpToTargetPosition({ tiebreaker: 0, time }),
      [jumpToTargetPosition]
    ),
    reportVisiblePositions,
    startLiveStreaming: useCallback(() => {
      setIsStreaming(true);
      jumpToTargetPosition(null);
      updateDateRange({ startDateExpression: 'now-1d', endDateExpression: 'now' });
    }, [setIsStreaming, updateDateRange]),
    stopLiveStreaming: useCallback(() => setIsStreaming(false), [setIsStreaming]),
    updateDateRange,
  };

  return { ...state, ...callbacks };
};

export const LogPositionState = createContainer(useLogPositionState);
