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
  getDiscoverAppStateFromContext,
  getGridColumnDisplayOptionsFromDiscoverAppState,
  getGridRowsDisplayOptionsFromDiscoverAppState,
  getQueryStateFromDiscoverAppState,
} from '../../../../utils/convert_discover_app_state';
import { LogExplorerControllerContext, LogExplorerControllerEvent } from '../types';

export type DiscoverServiceEvent =
  | {
      type: 'ADD_FILTER';
    }
  | {
      type: 'REMOVE_FILTER';
    };

export const subscribeToDiscoverState =
  () =>
  (
    context: LogExplorerControllerContext
  ): InvokeCallback<DiscoverServiceEvent, LogExplorerControllerEvent> =>
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

    onEvent((discoverServiceEvent) => {
      switch (discoverServiceEvent.type) {
        case 'ADD_FILTER':
          // TODO: figure out what to do here
          break;
        case 'REMOVE_FILTER':
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  };

export const updateContextFromDiscoverAppState = actions.assign<
  LogExplorerControllerContext,
  LogExplorerControllerEvent
>((context, event) => {
  if ('appState' in event && event.type === 'RECEIVE_DISCOVER_APP_STATE') {
    return {
      chart: {
        ...context.chart,
        ...getChartDisplayOptionsFromDiscoverAppState(event.appState),
      },
      grid: {
        columns:
          getGridColumnDisplayOptionsFromDiscoverAppState(event.appState) ?? context.grid.columns,
        rows: {
          ...context.grid.rows,
          ...getGridRowsDisplayOptionsFromDiscoverAppState(event.appState),
        },
      },
      ...getQueryStateFromDiscoverAppState(event.appState),
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

  context.discoverStateContainer.appState.update(getDiscoverAppStateFromContext(context));
};
