/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryStart } from '@kbn/data-plugin/public';
import { InvokeCallback } from 'xstate';
import type { LogExplorerControllerContext, LogExplorerControllerEvent } from '../types';

export const subscribeToQueryState =
  ({ query }: { query: QueryStart }) =>
  (
    context: LogExplorerControllerContext
  ): InvokeCallback<LogExplorerControllerEvent, LogExplorerControllerEvent> =>
  (send, onEvent) => {
    const subscription = query.state$.subscribe({
      next: ({ state: queryState }) => {
        send({
          type: 'RECEIVE_QUERY_STATE',
          queryState,
        });
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  };
