/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateLogExplorerController } from '@kbn/log-explorer-plugin/public';
import type { InvokeCreator } from 'xstate';
import type { ObservabilityLogExplorerContext, ObservabilityLogExplorerEvent } from './types';

type ControllerServiceEvent =
  | {
      type: 'addFilter';
    }
  | {
      type: 'removeFilter';
    };

export const createController =
  ({
    createLogExplorerController,
  }: {
    createLogExplorerController: CreateLogExplorerController;
  }): InvokeCreator<ObservabilityLogExplorerContext, ObservabilityLogExplorerEvent> =>
  (context, event) =>
  (send) => {
    createLogExplorerController({
      initialState: context.initialLogExplorerState,
    }).then((controller) => {
      send({
        type: 'CONTROLLER_CREATED',
        controller,
      });
    });
  };

export const subscribeToLogExplorerState: InvokeCreator<
  ObservabilityLogExplorerContext,
  ObservabilityLogExplorerEvent,
  any,
  ControllerServiceEvent
> = (context, event) => (send, onEvent) => {
  if (!('controller' in context)) {
    throw new Error('Failed to subscribe to controller: no controller in context');
  }

  const { controller } = context;

  const subscription = controller.state$.subscribe({
    next: (state) => {
      send({ type: 'LOG_EXPLORER_STATE_CHANGED', state });
    },
  });

  controller.service.start();

  onEvent((receivedEvent) => {
    if (receivedEvent.type === 'addFilter') {
      controller.actions.addFilter();
    } else if (receivedEvent.type === 'removeFilter') {
      controller.actions.removeFilter();
    }
  });

  return () => {
    subscription.unsubscribe();
    controller.service.stop();
  };
};
