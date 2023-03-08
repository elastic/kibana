/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useMemo } from 'react';
import { VisiblePositions } from '../../../observability_logs/log_stream_position_state/src/types';
import {
  LogStreamPageActorRef,
  LogStreamPageCallbacks,
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

export const useLogPositionState = ({
  logStreamPageState,
  logStreamPageCallbacks,
}: {
  logStreamPageState: InitializedLogStreamPageState;
  logStreamPageCallbacks: LogStreamPageCallbacks;
}): LogPositionStateParams & LogPositionCallbacks => {
  const dateRange = useMemo(() => getLegacyDateRange(logStreamPageState), [logStreamPageState]);

  const { refreshInterval, targetPosition, visiblePositions, latestPosition } =
    logStreamPageState.context;

  const actions = useMemo(() => {
    const {
      updateTimeRange,
      jumpToTargetPosition,
      jumpToTargetPositionTime,
      reportVisiblePositions,
      startLiveStreaming,
      stopLiveStreaming,
    } = logStreamPageCallbacks;

    return {
      jumpToTargetPosition,
      jumpToTargetPositionTime,
      reportVisiblePositions,
      startLiveStreaming,
      stopLiveStreaming,
      updateDateRange: (
        newDateRange: Partial<Pick<DateRange, 'startDateExpression' | 'endDateExpression'>>
      ) => {
        updateTimeRange({
          from: newDateRange.startDateExpression,
          to: newDateRange.endDateExpression,
        });
      },
    };
  }, [logStreamPageCallbacks]);

  const visibleTimeInterval = useMemo(
    () =>
      visiblePositions.startKey && visiblePositions.endKey
        ? { start: visiblePositions.startKey.time, end: visiblePositions.endKey.time }
        : null,
    [visiblePositions.startKey, visiblePositions.endKey]
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
