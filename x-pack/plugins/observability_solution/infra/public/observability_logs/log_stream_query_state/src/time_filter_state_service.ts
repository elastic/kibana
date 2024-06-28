/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval, TimefilterContract } from '@kbn/data-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { map, merge } from 'rxjs';
import { actions, InvokeCreator } from 'xstate';
import { datemathToEpochMillis } from '../../../utils/datemath';
import { DEFAULT_REFRESH_TIME_RANGE } from './defaults';
import { LogStreamQueryContext, LogStreamQueryEvent } from './types';

export interface TimefilterState {
  timeRange: TimeRange;
  refreshInterval: RefreshInterval;
}

export const initializeFromTimeFilterService =
  ({
    timeFilterService,
  }: {
    timeFilterService: TimefilterContract;
  }): InvokeCreator<LogStreamQueryContext, LogStreamQueryEvent> =>
  (_context, _event) =>
  (send) => {
    const timeRange = timeFilterService.getTime();
    const refreshInterval = timeFilterService.getRefreshInterval();

    send({
      type: 'INITIALIZED_FROM_TIME_FILTER_SERVICE',
      timeRange,
      refreshInterval,
    });
  };

export const updateTimeInTimeFilterService =
  ({ timeFilterService }: { timeFilterService: TimefilterContract }) =>
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if ('timeRange' in context) {
      timeFilterService.setTime(context.timeRange);
    }

    if ('refreshInterval' in context) {
      timeFilterService.setRefreshInterval(context.refreshInterval);
    }
  };

export const subscribeToTimeFilterServiceChanges =
  ({
    timeFilterService,
  }: {
    timeFilterService: TimefilterContract;
  }): InvokeCreator<LogStreamQueryContext, LogStreamQueryEvent> =>
  (context) =>
    merge(timeFilterService.getTimeUpdate$(), timeFilterService.getRefreshIntervalUpdate$()).pipe(
      map(() => getTimefilterState(timeFilterService)),
      map((timeState): LogStreamQueryEvent => {
        return {
          type: 'TIME_FROM_TIME_FILTER_SERVICE_CHANGED',
          ...timeState,
        };
      })
    );

const getTimefilterState = (timeFilterService: TimefilterContract): TimefilterState => ({
  timeRange: timeFilterService.getTime(),
  refreshInterval: timeFilterService.getRefreshInterval(),
});

export const updateTimeContextFromTimeFilterService = actions.assign(
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if (
      event.type === 'TIME_FROM_TIME_FILTER_SERVICE_CHANGED' ||
      event.type === 'INITIALIZED_FROM_TIME_FILTER_SERVICE'
    ) {
      return {
        ...getTimeFromEvent(context, event),
        refreshInterval:
          event.type === 'TIME_FROM_TIME_FILTER_SERVICE_CHANGED'
            ? event.refreshInterval
            : { ...context.refreshInterval, pause: event.refreshInterval.pause },
      };
    } else {
      return {};
    }
  }
);

export const updateTimeContextFromUrl = actions.assign(
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if (event.type === 'INITIALIZED_FROM_URL') {
      return {
        ...('timeRange' in event && event.timeRange ? { ...getTimeFromEvent(context, event) } : {}),
        ...('refreshInterval' in event && event.refreshInterval
          ? { refreshInterval: event.refreshInterval }
          : {}),
      };
    } else {
      return {};
    }
  }
);

export const updateTimeContextFromTimeRangeUpdate = actions.assign(
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if ('timeRange' in event && event.type === 'UPDATE_TIME_RANGE') {
      return getTimeFromEvent(context, event);
    } else {
      return {};
    }
  }
);

export const updateTimeContextFromRefreshIntervalUpdate = actions.assign(
  (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
    if (
      'refreshInterval' in event &&
      'refreshInterval' in context &&
      event.type === 'UPDATE_REFRESH_INTERVAL'
    ) {
      const pause = event.refreshInterval.pause ?? context.refreshInterval.pause;
      const value = event.refreshInterval.value ?? context.refreshInterval.value;

      const nowTimestamp = Date.now();

      const draftContext = {
        refreshInterval: {
          pause,
          value,
        },
        ...(!pause
          ? {
              timeRange: {
                ...DEFAULT_REFRESH_TIME_RANGE,
                lastChangedCompletely: nowTimestamp,
              },
            }
          : {}),
        ...(!pause
          ? {
              timestamps: {
                startTimestamp: datemathToEpochMillis(DEFAULT_REFRESH_TIME_RANGE.from, 'down') ?? 0,
                endTimestamp: datemathToEpochMillis(DEFAULT_REFRESH_TIME_RANGE.to, 'up') ?? 0,
                lastChangedTimestamp: nowTimestamp,
              },
            }
          : {}),
      };

      return draftContext;
    } else {
      return {};
    }
  }
);

const getTimeFromEvent = (context: LogStreamQueryContext, event: LogStreamQueryEvent) => {
  if (!('timeRange' in event) || !('timeRange' in context) || !('timestamps' in context)) {
    throw new Error('Missing keys to get time from event');
  }

  const nowTimestamp = Date.now();
  const from = event.timeRange?.from ?? context.timeRange.from;
  const to = event.timeRange?.to ?? context.timeRange.to;

  const fromTimestamp = event.timeRange?.from
    ? datemathToEpochMillis(from, 'down')
    : context.timestamps.startTimestamp;
  const toTimestamp = event.timeRange?.to
    ? datemathToEpochMillis(to, 'up')
    : context.timestamps.endTimestamp;

  return {
    timeRange: {
      from,
      to,
      lastChangedCompletely:
        event.timeRange?.from && event.timeRange?.to
          ? nowTimestamp
          : context.timeRange.lastChangedCompletely,
    },
    timestamps: {
      startTimestamp: fromTimestamp ?? 0,
      endTimestamp: toTimestamp ?? 0,
      lastChangedTimestamp: nowTimestamp,
    },
  };
};
