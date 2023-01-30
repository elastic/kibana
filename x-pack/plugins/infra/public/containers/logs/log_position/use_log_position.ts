/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import useThrottle from 'react-use/lib/useThrottle';
import { TimeKey } from '../../../../common/time';
import { withReduxDevTools } from '../../../utils/state_container_devtools';
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
const RELATIVE_END_UPDATE_DELAY = 1000;

export const useLogPositionState: () => LogPositionStateParams & LogPositionCallbacks = () => {
  const { initialStateFromUrl, startSyncingWithUrl } = useLogPositionUrlStateSync();
  const { initialStateFromTimefilter, startSyncingWithTimefilter } =
    useLogPositionTimefilterStateSync();

  const [logPositionStateContainer] = useState(() =>
    withReduxDevTools(
      createLogPositionStateContainer({
        initialStateFromUrl,
        initialStateFromTimefilter,
      }),
      {
        name: 'logPosition',
      }
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

  const { targetPosition, visiblePositions } = latestLogPositionState;

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

  const visibleTimeInterval = useMemo(
    () =>
      visiblePositions.startKey && visiblePositions.endKey
        ? { start: visiblePositions.startKey.time, end: visiblePositions.endKey.time }
        : null,
    [visiblePositions.startKey, visiblePositions.endKey]
  );

  // `endTimestamp` update conditions
  const throttledPagesAfterEnd = useThrottle(
    visiblePositions.pagesAfterEnd,
    RELATIVE_END_UPDATE_DELAY
  );
  useEffect(() => {
    if (dateRange.endDateExpression !== 'now') {
      return;
    }

    // User is close to the bottom edge of the scroll.
    if (throttledPagesAfterEnd <= DESIRED_BUFFER_PAGES) {
      logPositionStateContainer.transitions.updateTimeRange({ to: 'now' });
    }
  }, [dateRange.endDateExpression, throttledPagesAfterEnd, logPositionStateContainer]);

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
    visibleMidpoint: latestLogPositionState.latestPosition,
    visibleMidpointTime: latestLogPositionState.latestPosition?.time ?? null,
    visibleTimeInterval,

    // actions
    jumpToTargetPosition: logPositionStateContainer.transitions.jumpToTargetPosition,
    jumpToTargetPositionTime: logPositionStateContainer.transitions.jumpToTargetPositionTime,
    reportVisiblePositions: logPositionStateContainer.transitions.reportVisiblePositions,
    startLiveStreaming: logPositionStateContainer.transitions.startLiveStreaming,
    stopLiveStreaming: logPositionStateContainer.transitions.stopLiveStreaming,
    updateDateRange,
  };
};

export const [LogPositionStateProvider, useLogPositionStateContext] =
  createContainer(useLogPositionState);

const getLegacyDateRange = (logPositionState: LogPositionState): DateRange => ({
  endDateExpression: logPositionState.timeRange.expression.to,
  endTimestamp: logPositionState.timestamps.endTimestamp,
  lastCompleteDateRangeExpressionUpdate: logPositionState.timeRange.lastChangedCompletely,
  startDateExpression: logPositionState.timeRange.expression.from,
  startTimestamp: logPositionState.timestamps.startTimestamp,
  timestampsLastUpdate: logPositionState.timestamps.lastChangedTimestamp,
});
