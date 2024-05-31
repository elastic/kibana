/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryStart } from '@kbn/data-plugin/public';
import { map, merge, Observable } from 'rxjs';
import { ActionFunction, actions } from 'xstate';
import type { LogsExplorerControllerContext, LogsExplorerControllerEvent } from '../types';

export const subscribeToTimefilterService =
  (query: QueryStart) => (): Observable<LogsExplorerControllerEvent> => {
    const {
      timefilter: { timefilter },
    } = query;

    const time$ = timefilter.getTimeUpdate$().pipe(
      map(
        (): LogsExplorerControllerEvent => ({
          type: 'RECEIVE_TIMEFILTER_TIME',
          time: timefilter.getTime(),
        })
      )
    );

    const refreshInterval$ = timefilter.getRefreshIntervalUpdate$().pipe(
      map(
        (): LogsExplorerControllerEvent => ({
          type: 'RECEIVE_TIMEFILTER_REFRESH_INTERVAL',
          refreshInterval: timefilter.getRefreshInterval(),
        })
      )
    );

    return merge(time$, refreshInterval$);
  };

export const updateContextFromTimefilter = actions.assign<
  LogsExplorerControllerContext,
  LogsExplorerControllerEvent
>((context, event) => {
  if (event.type === 'RECEIVE_TIMEFILTER_TIME' && 'time' in event) {
    return {
      time: event.time,
    };
  }

  if (event.type === 'RECEIVE_TIMEFILTER_REFRESH_INTERVAL' && 'refreshInterval' in event) {
    return {
      refreshInterval: event.refreshInterval,
    };
  }

  return {};
});

export const updateTimefilterFromContext =
  (query: QueryStart): ActionFunction<LogsExplorerControllerContext, LogsExplorerControllerEvent> =>
  (context, _event) => {
    if (context.time != null) {
      query.timefilter.timefilter.setTime(context.time);
    }
    if (context.refreshInterval != null) {
      query.timefilter.timefilter.setRefreshInterval(context.refreshInterval);
    }
  };
