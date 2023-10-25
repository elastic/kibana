/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateLogExplorerController } from '@kbn/log-explorer-plugin/public';
import { InvokeCreator } from 'xstate';
import { ObservabilityLogExplorerContext, ObservabilityLogExplorerEvent } from './types';

export const createController =
  ({
    createLogExplorerController,
  }: {
    createLogExplorerController: CreateLogExplorerController;
  }): InvokeCreator<ObservabilityLogExplorerContext, ObservabilityLogExplorerEvent> =>
  (context, event) =>
  (send) => {
    if (!('initialControllerState' in context)) {
      send({ type: 'CONTROLLER_CREATED', controller: createLogExplorerController({}) });
    } else {
      send({
        type: 'CONTROLLER_CREATED',
        controller: createLogExplorerController({ initialState: context.initialControllerState }),
      });
    }
  };
