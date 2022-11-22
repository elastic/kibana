/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval } from '@kbn/data-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { createStateContainer } from '@kbn/kibana-utils-plugin/public';
import { identity, pipe } from 'fp-ts/lib/function';
import produce, { Draft, original } from 'immer';
import moment, { DurationInputObject } from 'moment';
import { isSameTimeKey, MinimalTimeKey, pickTimeKey, TimeKey } from '../../../../common/time';
import { datemathToEpochMillis } from '../../../utils/datemath';
import { TimefilterState } from '../../../utils/timefilter_state_storage';
import { LogPositionUrlState } from './use_log_position_url_state_sync';

interface VisiblePositions {
  startKey: TimeKey | null;
  middleKey: TimeKey | null;
  endKey: TimeKey | null;
  pagesAfterEnd: number;
  pagesBeforeStart: number;
}

export interface LogPositionState {
  timeRange: {
    expression: TimeRange;
    lastChangedCompletely: number;
  };
  timestamps: {
    startTimestamp: number;
    endTimestamp: number;
    lastChangedTimestamp: number;
  };
  refreshInterval: RefreshInterval;
  latestPosition: TimeKey | null;
  targetPosition: TimeKey | null;
  visiblePositions: VisiblePositions;
}

export interface InitialLogPositionArguments {
  initialStateFromUrl: LogPositionUrlState | null;
  initialStateFromTimefilter: TimefilterState | null;
  now?: Date;
}

/**
 * Initial state
 */

const initialTimeRangeExpression: TimeRange = {
  from: 'now-1d',
  to: 'now',
};

const initialRefreshInterval: RefreshInterval = {
  pause: true,
  value: 5000,
};

const initialVisiblePositions: VisiblePositions = {
  endKey: null,
  middleKey: null,
  startKey: null,
  pagesBeforeStart: Infinity,
  pagesAfterEnd: Infinity,
};

export const createInitialLogPositionState = ({
  initialStateFromUrl,
  initialStateFromTimefilter,
  now,
}: InitialLogPositionArguments): LogPositionState => {
  const nowTimestamp = now?.valueOf() ?? Date.now();

  return pipe(
    {
      timeRange: {
        expression: initialTimeRangeExpression,
        lastChangedCompletely: nowTimestamp,
      },
      timestamps: {
        startTimestamp: datemathToEpochMillis(initialTimeRangeExpression.from, 'down', now) ?? 0,
        endTimestamp: datemathToEpochMillis(initialTimeRangeExpression.to, 'up', now) ?? 0,
        lastChangedTimestamp: nowTimestamp,
      },
      refreshInterval: initialRefreshInterval,
      targetPosition: null,
      latestPosition: null,
      visiblePositions: initialVisiblePositions,
    },
    initialStateFromUrl != null
      ? initializeStateFromUrlState(initialStateFromUrl, now)
      : initialStateFromTimefilter != null
      ? updateStateFromTimefilterState(initialStateFromTimefilter, now)
      : identity
  );
};

export const createLogPositionStateContainer = (initialArguments: InitialLogPositionArguments) =>
  createStateContainer(createInitialLogPositionState(initialArguments), {
    updateTimeRange: (state: LogPositionState) => (timeRange: Partial<TimeRange>) =>
      updateTimeRange(timeRange)(state),
    updateRefreshInterval:
      (state: LogPositionState) => (refreshInterval: Partial<RefreshInterval>) =>
        updateRefreshInterval(refreshInterval)(state),
    startLiveStreaming: (state: LogPositionState) => () =>
      updateRefreshInterval({ pause: false })(state),
    stopLiveStreaming: (state: LogPositionState) => () =>
      updateRefreshInterval({ pause: true })(state),
    jumpToTargetPosition: (state: LogPositionState) => (targetPosition: TimeKey | null) =>
      updateTargetPosition(targetPosition)(state),
    jumpToTargetPositionTime: (state: LogPositionState) => (time: number) =>
      updateTargetPosition({ time })(state),
    reportVisiblePositions: (state: LogPositionState) => (visiblePositions: VisiblePositions) =>
      updateVisiblePositions(visiblePositions)(state),
  });

/**
 * Common updaters
 */

const updateVisiblePositions = (visiblePositions: VisiblePositions) =>
  produce<LogPositionState>((draftState) => {
    draftState.visiblePositions = visiblePositions;

    updateLatestPositionDraft(draftState);
  });

const updateTargetPosition = (targetPosition: Partial<MinimalTimeKey> | null) =>
  produce<LogPositionState>((draftState) => {
    if (targetPosition?.time != null) {
      draftState.targetPosition = {
        time: targetPosition.time,
        tiebreaker: targetPosition.tiebreaker ?? 0,
      };
    } else {
      draftState.targetPosition = null;
    }

    updateLatestPositionDraft(draftState);
  });

const updateLatestPositionDraft = (draftState: Draft<LogPositionState>) => {
  const previousState = original(draftState);
  const previousVisibleMiddleKey = previousState?.visiblePositions?.middleKey ?? null;
  const previousTargetPosition = previousState?.targetPosition ?? null;

  if (!isSameTimeKey(previousVisibleMiddleKey, draftState.visiblePositions.middleKey)) {
    draftState.latestPosition = draftState.visiblePositions.middleKey;
  } else if (!isSameTimeKey(previousTargetPosition, draftState.targetPosition)) {
    draftState.latestPosition = draftState.targetPosition;
  }
};

const updateTimeRange = (timeRange: Partial<TimeRange>, now?: Date) =>
  produce<LogPositionState>((draftState) => {
    const newFrom = timeRange?.from;
    const newTo = timeRange?.to;
    const nowTimestamp = now?.valueOf() ?? Date.now();

    // Update expression and timestamps
    if (newFrom != null) {
      draftState.timeRange.expression.from = newFrom;
      const newStartTimestamp = datemathToEpochMillis(newFrom, 'down', now);
      if (newStartTimestamp != null) {
        draftState.timestamps.startTimestamp = newStartTimestamp;
        draftState.timestamps.lastChangedTimestamp = nowTimestamp;
      }
    }
    if (newTo != null) {
      draftState.timeRange.expression.to = newTo;
      const newEndTimestamp = datemathToEpochMillis(newTo, 'up', now);
      if (newEndTimestamp != null) {
        draftState.timestamps.endTimestamp = newEndTimestamp;
        draftState.timestamps.lastChangedTimestamp = nowTimestamp;
      }
    }
    if (newFrom != null && newTo != null) {
      draftState.timeRange.lastChangedCompletely = nowTimestamp;
    }

    // Reset the target position if it doesn't fall within the new range.
    if (
      draftState.targetPosition != null &&
      (draftState.timestamps.startTimestamp > draftState.targetPosition.time ||
        draftState.timestamps.endTimestamp < draftState.targetPosition.time)
    ) {
      draftState.targetPosition = null;

      updateLatestPositionDraft(draftState);
    }
  });

const updateRefreshInterval =
  (refreshInterval: Partial<RefreshInterval>) => (state: LogPositionState) =>
    pipe(
      state,
      produce<LogPositionState>((draftState) => {
        if (refreshInterval.pause != null) {
          draftState.refreshInterval.pause = refreshInterval.pause;
        }
        if (refreshInterval.value != null) {
          draftState.refreshInterval.value = refreshInterval.value;
        }

        if (!draftState.refreshInterval.pause) {
          draftState.targetPosition = null;

          updateLatestPositionDraft(draftState);
        }
      }),
      (currentState) => {
        if (!currentState.refreshInterval.pause) {
          return updateTimeRange(initialTimeRangeExpression)(currentState);
        } else {
          return currentState;
        }
      }
    );

/**
 * URL state helpers
 */

export const getUrlState = (state: LogPositionState): LogPositionUrlState => ({
  streamLive: !state.refreshInterval.pause,
  start: state.timeRange.expression.from,
  end: state.timeRange.expression.to,
  position: state.latestPosition ? pickTimeKey(state.latestPosition) : null,
});

export const initializeStateFromUrlState =
  (urlState: LogPositionUrlState | null, now?: Date) =>
  (state: LogPositionState): LogPositionState =>
    pipe(
      state,
      updateTargetPosition(urlState?.position ?? null),
      updateTimeRange(
        {
          from: urlState?.start ?? getTimeRangeStartFromPosition(urlState?.position),
          to: urlState?.end ?? getTimeRangeEndFromPosition(urlState?.position),
        },
        now
      ),
      updateRefreshInterval({ pause: !urlState?.streamLive })
    );

export const updateStateFromUrlState =
  (urlState: LogPositionUrlState | null, now?: Date) =>
  (state: LogPositionState): LogPositionState =>
    pipe(
      state,
      updateTargetPosition(urlState?.position ?? null),
      updateTimeRange(
        {
          from: urlState?.start,
          to: urlState?.end,
        },
        now
      ),
      updateRefreshInterval({ pause: !urlState?.streamLive })
    );

/**
 * Timefilter helpers
 */

export const getTimefilterState = (state: LogPositionState): TimefilterState => ({
  timeRange: state.timeRange.expression,
  refreshInterval: state.refreshInterval,
});

export const updateStateFromTimefilterState =
  (timefilterState: TimefilterState | null, now?: Date) =>
  (state: LogPositionState): LogPositionState =>
    pipe(
      state,
      updateTimeRange(
        {
          from: timefilterState?.timeRange?.from,
          to: timefilterState?.timeRange?.to,
        },
        now
      ),
      updateRefreshInterval({
        pause: timefilterState?.refreshInterval?.pause,
        value: Math.max(timefilterState?.refreshInterval?.value ?? 0, initialRefreshInterval.value),
      })
    );

const defaultTimeRangeFromPositionOffset: DurationInputObject = { hours: 1 };

const getTimeRangeStartFromPosition = (
  position: Partial<MinimalTimeKey> | null | undefined
): string | undefined =>
  position?.time != null
    ? moment(position.time).subtract(defaultTimeRangeFromPositionOffset).toISOString()
    : undefined;

const getTimeRangeEndFromPosition = (
  position: Partial<MinimalTimeKey> | null | undefined
): string | undefined =>
  position?.time != null
    ? moment(position.time).add(defaultTimeRangeFromPositionOffset).toISOString()
    : undefined;
