/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateDatasetQualityController } from '@kbn/dataset-quality-plugin/public/controller';
import type { InvokeCreator } from 'xstate';
import type { ObservabilityDatasetQualityContext, ObservabilityDatasetQualityEvent } from './types';

export const createController =
  ({
    createDatasetQualityController,
  }: {
    createDatasetQualityController: CreateDatasetQualityController;
  }): InvokeCreator<ObservabilityDatasetQualityContext, ObservabilityDatasetQualityEvent> =>
  (context, event) =>
  (send) => {
    createDatasetQualityController({
      initialState: context.initialDatasetQualityState,
    }).then((controller) => {
      send({
        type: 'CONTROLLER_CREATED',
        controller,
      });
    });
  };

export const subscribeToDatasetQualityState: InvokeCreator<
  ObservabilityDatasetQualityContext,
  ObservabilityDatasetQualityEvent
> = (context, _event) => (send) => {
  if (!('controller' in context)) {
    throw new Error('Failed to subscribe to controller: no controller in context');
  }

  const { controller } = context;

  const subscription = controller.state$.subscribe({
    next: (state) => {
      send({ type: 'DATASET_QUALITY_STATE_CHANGED', state });
    },
  });

  controller.service.start();

  return () => {
    subscription.unsubscribe();
    controller.service.stop();
  };
};

export const openDatasetFlyout = (context: ObservabilityDatasetQualityContext) => {
  if (!('controller' in context)) {
    throw new Error('Failed to subscribe to controller: no controller in context');
  }

  const {
    controller,
    initialDatasetQualityState: { flyout },
  } = context;

  if (flyout?.dataset) {
    controller.service.send({
      type: 'OPEN_FLYOUT',
      dataset: flyout.dataset,
    });
  }
};
