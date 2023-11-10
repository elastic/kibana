/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverAppState } from '@kbn/discover-plugin/public';
import { isEmpty } from 'lodash';
import { ActionFunction, actions, InvokeCallback } from 'xstate';
import { LogExplorerControllerContext, LogExplorerControllerEvent } from '../types';

export const subscribeToDiscoverState =
  () =>
  (
    context: LogExplorerControllerContext
  ): InvokeCallback<LogExplorerControllerEvent, LogExplorerControllerEvent> =>
  (send, onEvent) => {
    if (!('discoverStateContainer' in context)) {
      throw new Error('Failed to subscribe to the Discover state: no state container in context.');
    }

    const { appState } = context.discoverStateContainer;

    const subscription = appState.state$.subscribe({
      next: (newAppState) => {
        if (isEmpty(newAppState)) {
          return;
        }

        send({
          type: 'RECEIVE_DISCOVER_APP_STATE',
          appState: newAppState,
        });
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  };

export const updateGridFromDiscoverAppState = actions.assign<
  LogExplorerControllerContext,
  LogExplorerControllerEvent
>((context, event) => {
  if ('appState' in event && event.type === 'RECEIVE_DISCOVER_APP_STATE') {
    return {
      grid: {
        columns:
          event.appState.columns?.map((field) => ({
            field,
            width: event.appState.grid?.columns?.[field]?.width,
          })) ?? context.grid.columns,
        rows: {
          rowHeight: event.appState.rowHeight ?? context.grid.rows.rowHeight,
          rowsPerPage: event.appState.rowsPerPage ?? context.grid.rows.rowsPerPage,
        },
      },
    };
  }

  return {};
});

export const updateChartFromDiscoverAppState = actions.assign<
  LogExplorerControllerContext,
  LogExplorerControllerEvent
>((context, event) => {
  if ('appState' in event && event.type === 'RECEIVE_DISCOVER_APP_STATE') {
    return {
      chart: {
        breakdownField: event.appState.breakdownField ?? context.chart.breakdownField,
      },
    };
  }

  return {};
});

export const updateDiscoverAppStateFromContext: ActionFunction<
  LogExplorerControllerContext,
  LogExplorerControllerEvent
> = (context, _event) => {
  if (!('discoverStateContainer' in context)) {
    return;
  }

  context.discoverStateContainer.appState.update({
    breakdownField: context.chart.breakdownField,
    columns: context.grid.columns.map(({ field }) => field),
    grid: {
      columns: context.grid.columns.reduce<
        NonNullable<NonNullable<DiscoverAppState['grid']>['columns']>
      >((gridColumns, { field, width }) => {
        if (width != null) {
          gridColumns[field] = { width };
        }
        return gridColumns;
      }, {}),
    },
    rowHeight: context.grid.rows.rowHeight,
    rowsPerPage: context.grid.rows.rowsPerPage,
  });
};
