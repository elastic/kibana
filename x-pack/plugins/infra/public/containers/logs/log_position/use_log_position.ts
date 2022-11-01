/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import { TimeKey } from '../../../../common/time';
import { TimefilterState } from '../../../utils/timefilter_state_storage';
import { useObservableState } from '../../../utils/use_observable';
import { wrapStateContainer } from '../../../utils/wrap_state_container';
import {
  createLogPositionStateContainer,
  getTimefilterState,
  getUrlState,
  LogPositionState,
  updateStateFromTimefilterState,
  updateStateFromUrlState,
  withLogger,
} from './log_position_state';
import { useLogPositionTimefilterStateSync } from './log_position_timefilter_state';
import { LogPositionUrlState, useLogPositionUrlStateSync } from './use_log_position_url_state_sync';

type TimeKeyOrNull = TimeKey | null;

interface DateRange {
  startDateExpression: string;
  endDateExpression: string;
  startTimestamp: number;
  endTimestamp: number;
  timestampsLastUpdate: number;
  lastCompleteDateRangeExpressionUpdate: number;
}

interface VisiblePositions {
  startKey: TimeKeyOrNull;
  middleKey: TimeKeyOrNull;
  endKey: TimeKeyOrNull;
  pagesAfterEnd: number;
  pagesBeforeStart: number;
}

export type LogPositionStateParams = DateRange & {
  targetPosition: TimeKeyOrNull;
  isStreaming: boolean;
  firstVisiblePosition: TimeKeyOrNull;
  pagesBeforeStart: number;
  pagesAfterEnd: number;
  visibleMidpoint: TimeKeyOrNull;
  visibleMidpointTime: number | null;
  visibleTimeInterval: { start: number; end: number } | null;
};

export interface LogPositionCallbacks {
  jumpToTargetPosition: (pos: TimeKeyOrNull) => void;
  jumpToTargetPositionTime: (time: number) => void;
  reportVisiblePositions: (visPos: VisiblePositions) => void;
  startLiveStreaming: () => void;
  stopLiveStreaming: () => void;
  updateDateRange: UpdateDateRangeFn;
}

type UpdateDateRangeFn = (
  newDateRange: Partial<Pick<DateRange, 'startDateExpression' | 'endDateExpression'>>
) => void;

const DESIRED_BUFFER_PAGES = 2;

export const useLogPositionState: () => LogPositionStateParams & LogPositionCallbacks = () => {
  const { initialStateFromUrl, startSyncingWithUrl } = useLogPositionUrlStateSync();
  const { initialStateFromTimefilter, startSyncingWithTimefilter } =
    useLogPositionTimefilterStateSync();

  const [logPositionStateContainer] = useState(() =>
    withLogger(
      createLogPositionStateContainer({
        initialStateFromUrl,
        initialStateFromTimefilter,
      })
    )
  );

  useEffect(() => {
    return startSyncingWithUrl(
      wrapStateContainer<LogPositionState, LogPositionUrlState>({
        wrapGet: getUrlState,
        wrapSet: updateStateFromUrlState,
      })(logPositionStateContainer)
    );
  }, [logPositionStateContainer, startSyncingWithUrl]);

  useEffect(() => {
    return startSyncingWithTimefilter(
      wrapStateContainer<LogPositionState, TimefilterState>({
        wrapGet: getTimefilterState,
        wrapSet: updateStateFromTimefilterState,
      })(logPositionStateContainer)
    );
  }, [logPositionStateContainer, startSyncingWithTimefilter, startSyncingWithUrl]);

  const { latestValue: latestLogPositionState } = useObservableState(
    logPositionStateContainer.state$,
    () => logPositionStateContainer.get()
  );

  const dateRange = useMemo(
    () => getLegacyDateRange(latestLogPositionState),
    [latestLogPositionState]
  );

  const targetPosition = useMemo(
    () => latestLogPositionState.targetPosition,
    [latestLogPositionState]
  );

  const isStreaming = useMemo(
    () => !latestLogPositionState.refreshInterval.pause,
    [latestLogPositionState]
  );

  const updateDateRange = useCallback<UpdateDateRangeFn>(
    (newDateRange: Partial<Pick<DateRange, 'startDateExpression' | 'endDateExpression'>>) =>
      logPositionStateContainer.transitions.updateTimeRange({
        from: newDateRange.startDateExpression,
        to: newDateRange.endDateExpression,
      }),
    [logPositionStateContainer]
  );

  const { reportVisiblePositions, visibleMidpoint, visiblePositions, visibleTimeInterval } =
    useVisiblePositions(targetPosition);

  // `endTimestamp` update conditions
  useEffect(() => {
    if (dateRange.endDateExpression !== 'now') {
      return;
    }

    // User is close to the bottom edge of the scroll.
    if (visiblePositions.pagesAfterEnd <= DESIRED_BUFFER_PAGES) {
      logPositionStateContainer.transitions.updateTimeRange({ to: 'now' });
    }
  }, [dateRange.endDateExpression, visiblePositions, logPositionStateContainer]);

  useInterval(
    () => logPositionStateContainer.transitions.updateTimeRange({ from: 'now-1d', to: 'now' }),
    latestLogPositionState.refreshInterval.pause ||
      latestLogPositionState.refreshInterval.value <= 0
      ? null
      : latestLogPositionState.refreshInterval.value
  );

  return {
    // position state
    targetPosition,
    isStreaming,
    ...dateRange,

    // visible positions state
    firstVisiblePosition: visiblePositions.startKey,
    pagesBeforeStart: visiblePositions.pagesBeforeStart,
    pagesAfterEnd: visiblePositions.pagesAfterEnd,
    visibleMidpoint,
    visibleMidpointTime: visibleMidpoint ? visibleMidpoint.time : null,
    visibleTimeInterval,

    // actions
    jumpToTargetPosition: logPositionStateContainer.transitions.jumpToTargetPosition,
    jumpToTargetPositionTime: logPositionStateContainer.transitions.jumpToTargetPositionTime,
    reportVisiblePositions,
    startLiveStreaming: logPositionStateContainer.transitions.startLiveStreaming,
    stopLiveStreaming: logPositionStateContainer.transitions.stopLiveStreaming,
    updateDateRange,
  };
};

export const [LogPositionStateProvider, useLogPositionStateContext] =
  createContainer(useLogPositionState);

const useVisiblePositions = (targetPosition: TimeKeyOrNull) => {
  const [visiblePositions, reportVisiblePositions] = useState<VisiblePositions>({
    endKey: null,
    middleKey: null,
    startKey: null,
    pagesBeforeStart: Infinity,
    pagesAfterEnd: Infinity,
  });

  const { startKey, middleKey, endKey } = visiblePositions;

  const visibleMidpoint = useVisibleMidpoint(middleKey, targetPosition);

  const visibleTimeInterval = useMemo(
    () => (startKey && endKey ? { start: startKey.time, end: endKey.time } : null),
    [startKey, endKey]
  );

  return {
    reportVisiblePositions,
    visibleMidpoint,
    visiblePositions,
    visibleTimeInterval,
  };
};

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

const getLegacyDateRange = (logPositionState: LogPositionState): DateRange => ({
  endDateExpression: logPositionState.timeRange.expression.to,
  endTimestamp: logPositionState.timestamps.endTimestamp,
  lastCompleteDateRangeExpressionUpdate: logPositionState.timeRange.lastChangedCompletely,
  startDateExpression: logPositionState.timeRange.expression.from,
  startTimestamp: logPositionState.timestamps.startTimestamp,
  timestampsLastUpdate: logPositionState.timestamps.lastChangedTimestamp,
});
