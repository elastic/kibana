import type { MlPluginSetup } from './plugin';
import { createAlertingServiceProviderMock } from './shared_services/providers/__mocks__/alerting_service';
import { createAnomalyDetectorsProviderMock } from './shared_services/providers/__mocks__/anomaly_detectors';
import { createJobServiceProviderMock } from './shared_services/providers/__mocks__/jobs_service';
import { createModulesProviderMock } from './shared_services/providers/__mocks__/modules';
import { createResultsServiceProviderMock } from './shared_services/providers/__mocks__/results_service';
import { createMockMlSystemProvider } from './shared_services/providers/__mocks__/system';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createTrainedModelsProviderMock } from './shared_services/providers/__mocks__/trained_models';

const createSetupContract = () =>
  ({
    jobServiceProvider: createJobServiceProviderMock(),
    anomalyDetectorsProvider: createAnomalyDetectorsProviderMock(),
    mlSystemProvider: createMockMlSystemProvider(),
    modulesProvider: createModulesProviderMock(),
    resultsServiceProvider: createResultsServiceProviderMock(),
    alertingServiceProvider: createAlertingServiceProviderMock(),
    trainedModelsProvider: createTrainedModelsProviderMock(),
  }) as unknown as jest.Mocked<MlPluginSetup>;

const createStartContract = () => jest.fn();

export const mlPluginServerMock = {
  createSetupContract,
  createStartContract,
};
