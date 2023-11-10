/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ActionFunction, actions, InvokeCallback } from 'xstate';
import {
  getChartDisplayOptionsFromDiscoverAppState,
  getDiscoverAppStateFromDisplayOptions,
  getGridColumnDisplayOptionsFromDiscoverAppState,
  getGridRowsDisplayOptionsFromDiscoverAppState,
} from '../../../../utils/convert_discover_app_state';
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
          getGridColumnDisplayOptionsFromDiscoverAppState(event.appState) ?? context.grid.columns,
        rows: {
          ...context.grid.rows,
          ...getGridRowsDisplayOptionsFromDiscoverAppState(event.appState),
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
        ...context.chart,
        ...getChartDisplayOptionsFromDiscoverAppState(event.appState),
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

  context.discoverStateContainer.appState.update(getDiscoverAppStateFromDisplayOptions(context));
};
