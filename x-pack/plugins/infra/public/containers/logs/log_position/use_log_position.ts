/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useEffect, useMemo } from 'react';
import useThrottle from 'react-use/lib/useThrottle';
import { VisiblePositions } from '../../../observability_logs/log_stream_position_state/src/types';
import {
  LogStreamPageActorRef,
  LogStreamPageSend,
} from '../../../observability_logs/log_stream_page/state';
import { MatchedStateFromActor } from '../../../observability_logs/xstate_helpers';
import { TimeKey } from '../../../../common/time';

type TimeKeyOrNull = TimeKey | null;

interface DateRange {
  startDateExpression: string;
  endDateExpression: string;
  startTimestamp: number;
  endTimestamp: number;
  timestampsLastUpdate: number;
  lastCompleteDateRangeExpressionUpdate: number;
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

export const useLogPositionState = ({
  logStreamPageState,
  logStreamPageSend,
}: {
  logStreamPageState: InitializedLogStreamPageState;
  logStreamPageSend: LogStreamPageSend;
}): LogPositionStateParams & LogPositionCallbacks => {
  const dateRange = useMemo(() => getLegacyDateRange(logStreamPageState), [logStreamPageState]);

  const { refreshInterval, timeRange, targetPosition, visiblePositions, latestPosition } =
    logStreamPageState.context;

  const updateDateRange = useCallback<UpdateDateRangeFn>(
    (newDateRange: Partial<Pick<DateRange, 'startDateExpression' | 'endDateExpression'>>) =>
      logStreamPageSend({
        type: 'UPDATE_TIME_RANGE',
        timeRange: { from: newDateRange.startDateExpression, to: newDateRange.endDateExpression },
      }),
    [logStreamPageSend]
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
    if (timeRange.to !== 'now') {
      return;
    }

    // User is close to the bottom edge of the scroll.
    if (throttledPagesAfterEnd <= DESIRED_BUFFER_PAGES) {
      logStreamPageSend({
        type: 'UPDATE_TIME_RANGE',
        timeRange: { to: 'now' },
      });
    }
  }, [timeRange.to, throttledPagesAfterEnd, logStreamPageSend]);

  const actions = useMemo(
    () => ({
      jumpToTargetPosition: (_targetPosition: TimeKey | null) => {
        logStreamPageSend({ type: 'JUMP_TO_TARGET_POSITION', targetPosition: _targetPosition });
      },
      jumpToTargetPositionTime: (time: number) => {
        logStreamPageSend({ type: 'JUMP_TO_TARGET_POSITION', targetPosition: { time } });
      },
      reportVisiblePositions: (_visiblePositions: VisiblePositions) => {
        logStreamPageSend({
          type: 'REPORT_VISIBLE_POSITIONS',
          visiblePositions: _visiblePositions,
        });
      },
      startLiveStreaming: () => {
        logStreamPageSend({ type: 'UPDATE_REFRESH_INTERVAL', refreshInterval: { pause: false } });
      },
      stopLiveStreaming: () => {
        logStreamPageSend({ type: 'UPDATE_REFRESH_INTERVAL', refreshInterval: { pause: true } });
      },
    }),
    [logStreamPageSend]
  );

  return {
    // position state
    targetPosition,
    isStreaming: !refreshInterval.pause,
    ...dateRange,

    // visible positions state
    firstVisiblePosition: visiblePositions.startKey,
    pagesBeforeStart: visiblePositions.pagesBeforeStart,
    pagesAfterEnd: visiblePositions.pagesAfterEnd,
    visibleMidpoint: latestPosition,
    visibleMidpointTime: latestPosition?.time ?? null,
    visibleTimeInterval,

    // actions
    ...actions,
    updateDateRange,
  };
};

export const [LogPositionStateProvider, useLogPositionStateContext] =
  createContainer(useLogPositionState);

const getLegacyDateRange = (logStreamPageState: InitializedLogStreamPageState): DateRange => {
  return {
    startDateExpression: logStreamPageState.context.timeRange.from,
    endDateExpression: logStreamPageState.context.timeRange.to,
    startTimestamp: logStreamPageState.context.timestamps.startTimestamp,
    endTimestamp: logStreamPageState.context.timestamps.endTimestamp,
    lastCompleteDateRangeExpressionUpdate:
      logStreamPageState.context.timeRange.lastChangedCompletely,
    timestampsLastUpdate: logStreamPageState.context.timestamps.lastChangedTimestamp,
  };
};

type InitializedLogStreamPageState = MatchedStateFromActor<
  LogStreamPageActorRef,
  { hasLogViewIndices: 'initialized' }
>;
