/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateLogExplorerController } from '@kbn/log-explorer-plugin/public';
import { map, throwError } from 'rxjs';
import type { InvokeCreator } from 'xstate';
import type { ObservabilityLogExplorerContext, ObservabilityLogExplorerEvent } from './types';

export const createController =
  ({
    createLogExplorerController,
  }: {
    createLogExplorerController: CreateLogExplorerController;
  }): InvokeCreator<ObservabilityLogExplorerContext, ObservabilityLogExplorerEvent> =>
  (context, event) =>
  (send) => {
    send({
      type: 'CONTROLLER_CREATED',
      controller: createLogExplorerController({ initialState: context.initialLogExplorerState }),
    });
  };

export const subscribeToLogExplorerState: InvokeCreator<
  ObservabilityLogExplorerContext,
  ObservabilityLogExplorerEvent
> = (context, event) =>
  'controller' in context
    ? context.controller?.state$.pipe(
        map((value) => ({ type: 'LOG_EXPLORER_STATE_CHANGED', state: value }))
      )
    : throwError(() => new Error('Failed to subscribe to controller: no controller in context'));
