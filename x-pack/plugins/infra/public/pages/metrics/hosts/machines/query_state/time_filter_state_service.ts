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
import { datemathToEpochMillis, parseDateRange } from '../../../../../utils/datemath';
import { HostsViewQueryContext, HostsViewQueryEvent } from './types';

export interface TimefilterState {
  timeRange: TimeRange;
  refreshInterval: RefreshInterval;
}

export const initializeFromTimeFilterService =
  ({
    timeFilterService,
  }: {
    timeFilterService: TimefilterContract;
  }): InvokeCreator<HostsViewQueryContext, HostsViewQueryEvent> =>
  (_context, _event) =>
  (send) => {
    const timeRange = timeFilterService.getTime();

    send({
      type: 'INITIALIZED_FROM_TIME_FILTER_SERVICE',
      timeRange,
    });
  };

export const updateTimeInTimeFilterService =
  ({ timeFilterService }: { timeFilterService: TimefilterContract }) =>
  (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
    if ('timeRange' in context) {
      timeFilterService.setTime(context.timeRange);
    }
  };

export const subscribeToTimeFilterServiceChanges =
  ({
    timeFilterService,
  }: {
    timeFilterService: TimefilterContract;
  }): InvokeCreator<HostsViewQueryContext, HostsViewQueryEvent> =>
  (context) =>
    merge(timeFilterService.getTimeUpdate$(), timeFilterService.getRefreshIntervalUpdate$()).pipe(
      map(() => getTimefilterState(timeFilterService)),
      map((timeState): HostsViewQueryEvent => {
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
  (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
    if (
      event.type === 'TIME_FROM_TIME_FILTER_SERVICE_CHANGED' ||
      event.type === 'INITIALIZED_FROM_TIME_FILTER_SERVICE'
    ) {
      return {
        ...getTimeFromEvent(context, event),
      };
    } else {
      return {};
    }
  }
);

export const updateTimeContextFromUrl = actions.assign(
  (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
    if (event.type === 'INITIALIZED_FROM_URL') {
      return {
        ...('timeRange' in event && event.timeRange ? { ...getTimeFromEvent(context, event) } : {}),
      };
    } else {
      return {};
    }
  }
);

export const updateTimeContextFromTimeRangeUpdate = actions.assign(
  (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
    if ('timeRange' in event && event.type === 'UPDATE_TIME_RANGE') {
      return getTimeFromEvent(context, event);
    } else {
      return {};
    }
  }
);

const getTimeFromEvent = (context: HostsViewQueryContext, event: HostsViewQueryEvent) => {
  if (!('timeRange' in event) || !('timestamps' in context)) {
    throw new Error('Missing keys to get time from event');
  }

  const from = event.timeRange?.from ?? context.timeRange.from;
  const to = event.timeRange?.to ?? context.timeRange.to;

  const { from: isoFrom = '', to: isoTo = '' } = parseDateRange({
    from,
    to,
  });

  const fromTimestamp = event.timeRange?.from
    ? datemathToEpochMillis(from, 'down')
    : context.timestamps.from;
  const toTimestamp = event.timeRange?.to ? datemathToEpochMillis(to, 'up') : context.timestamps.to;

  return {
    timeRange: {
      from,
      to,
    },
    isoTimeRange: {
      from: isoFrom,
      to: isoTo,
    },
    timestamps: {
      from: fromTimestamp ?? 0,
      to: toTimestamp ?? 0,
    },
  };
};
