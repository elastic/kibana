/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval } from '@kbn/data-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { createStateContainer, ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/public';
import { identity, pipe } from 'fp-ts/lib/function';
import produce from 'immer';
import logger from 'redux-logger';
import { MinimalTimeKey, TimeKey } from '../../../../common/time';
import { datemathToEpochMillis } from '../../../utils/datemath';
import { TimefilterState } from '../../../utils/timefilter_state_storage';
import { LogPositionUrlState } from './use_log_position_url_state_sync';

export interface LogPositionState {
  targetPosition: TimeKey | null;
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
}

export interface InitialLogPositionArguments {
  initialStateFromUrl: LogPositionUrlState | null;
  initialStateFromTimefilter: TimefilterState | null;
  now?: Date;
}

export const createInitialLogPositionState = ({
  initialStateFromUrl,
  initialStateFromTimefilter,
  now,
}: InitialLogPositionArguments): LogPositionState => {
  const nowTimestamp = now?.valueOf() ?? Date.now();

  return pipe(
    {
      targetPosition: null,
      timeRange: {
        expression: {
          from: 'now-1d',
          to: 'now',
        },
        lastChangedCompletely: nowTimestamp,
      },
      timestamps: {
        startTimestamp: datemathToEpochMillis('now-1d', 'down', now) ?? 0,
        endTimestamp: datemathToEpochMillis('now', 'up', now) ?? 0,
        lastChangedTimestamp: nowTimestamp,
      },
      refreshInterval: {
        pause: true,
        value: 5000,
      },
    },
    initialStateFromUrl != null
      ? updateStateFromUrlState(initialStateFromUrl)
      : initialStateFromTimefilter != null
      ? updateStateFromTimefilterState(initialStateFromTimefilter)
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
      updateRefreshInterval({ pause: false, value: 5000 })(state),
    stopLiveStreaming: (state: LogPositionState) => () =>
      updateRefreshInterval({ pause: true })(state),
    jumpToTargetPosition: (state: LogPositionState) => (targetPosition: TimeKey | null) =>
      updateTargetPosition(targetPosition)(state),
    jumpToTargetPositionTime: (state: LogPositionState) => (time: number) =>
      updateTargetPosition({ time })(state),
  });

export const withDevelopmentLogger = <StateContainer extends ReduxLikeStateContainer<any>>(
  stateContainer: StateContainer
): StateContainer => {
  if (process.env.NODE_ENV !== 'production') {
    stateContainer.addMiddleware(logger as any);
  }

  return stateContainer;
};

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
  });

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
        }
      }),
      (currentState) => {
        if (!currentState.refreshInterval.pause) {
          return updateTimeRange({ from: 'now-1d', to: 'now' })(currentState);
        } else {
          return currentState;
        }
      }
    );

export const getUrlState = (state: LogPositionState): LogPositionUrlState => ({
  streamLive: !state.refreshInterval.pause,
  start: state.timeRange.expression.from,
  end: state.timeRange.expression.to,
  position: state.targetPosition,
});

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

export const getTimefilterState = (state: LogPositionState): TimefilterState => ({
  timeRange: state.timeRange.expression,
  refreshInterval: state.refreshInterval,
});

export const updateStateFromTimefilterState =
  (timefilterState: TimefilterState | null) =>
  (state: LogPositionState): LogPositionState =>
    pipe(
      state,
      updateTimeRange({
        from: timefilterState?.timeRange?.from,
        to: timefilterState?.timeRange?.to,
      }),
      updateRefreshInterval({
        pause: timefilterState?.refreshInterval?.pause,
        value: timefilterState?.refreshInterval?.value,
      })
    );
