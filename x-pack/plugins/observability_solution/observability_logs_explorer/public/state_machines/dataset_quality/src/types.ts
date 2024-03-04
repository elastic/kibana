/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DatasetQualityController,
  DatasetQualityPublicState,
  DatasetQualityPublicStateUpdate,
} from '@kbn/dataset-quality-plugin/public/controller';

export type ObservabilityDatasetQualityContext = ObservabilityDatasetQualityTypeState['context'];

export interface CommonObservabilityDatasetQualityContext {
  initialDatasetQualityState: DatasetQualityPublicStateUpdate;
}

export interface WithDatasetQualityState {
  datasetQualityState: DatasetQualityPublicState;
}

export interface WithController {
  controller: DatasetQualityController;
}

export type ObservabilityDatasetQualityEvent =
  | {
      type: 'INITIALIZED_FROM_URL';
      stateFromUrl?: DatasetQualityPublicStateUpdate;
    }
  | {
      type: 'CONTROLLER_CREATED';
      controller: DatasetQualityController;
    }
  | {
      type: 'DATASET_QUALITY_STATE_CHANGED';
      state: DatasetQualityPublicState;
    };

export type ObservabilityDatasetQualityTypeState =
  | {
      value: 'initializingFromUrl' | 'creatingController';
      context: CommonObservabilityDatasetQualityContext;
    }
  | {
      value: 'initialized' | { initialized: 'unknownDatasetQualityState' };
      context: CommonObservabilityDatasetQualityContext & WithController;
    }
  | {
      value: { initialized: 'validDatasetQualityState' };
      context: CommonObservabilityDatasetQualityContext & WithDatasetQualityState & WithController;
    };
