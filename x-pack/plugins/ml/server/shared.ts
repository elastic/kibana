/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from '../common/types/anomaly_detection_jobs';
export * from './lib/capabilities/errors';
export type { ModuleSetupPayload } from './shared_services/providers/modules';

import type { SharedServices } from './shared_services';
export type AlertingService = ReturnType<SharedServices['alertingServiceProvider']>;
export type AnomalyDetectors = ReturnType<SharedServices['anomalyDetectorsProvider']>;
export type JobService = ReturnType<SharedServices['jobServiceProvider']>;
export type MlSystem = ReturnType<SharedServices['mlSystemProvider']>;
export type Modules = ReturnType<SharedServices['modulesProvider']>;
export type ResultsService = ReturnType<SharedServices['resultsServiceProvider']>;
export type TrainedModels = ReturnType<SharedServices['trainedModelsProvider']>;
