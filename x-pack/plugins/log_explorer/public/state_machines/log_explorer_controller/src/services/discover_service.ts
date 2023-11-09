/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvokeCallback } from 'xstate';
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
      next: (newAppState) =>
        send({
          type: 'APP_STATE_CHANGED',
          appState: newAppState,
        }),
    });

    return () => {
      subscription.unsubscribe();
    };
  };
