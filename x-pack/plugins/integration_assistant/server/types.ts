/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';

export interface IntegrationAssistantPluginSetup {
  setIsAvailable: (isAvailable: boolean) => void;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IntegrationAssistantPluginStart {}

export interface IntegrationAssistantPluginSetupDependencies {
  licensing: LicensingPluginSetup;
}
export interface IntegrationAssistantPluginStartDependencies {
  licensing: LicensingPluginStart;
}

export interface CategorizationState {
  rawSamples: string[];
  samples: string[];
  formattedSamples: string;
  ecsTypes: string;
  ecsCategories: string;
  exAnswer: string;
  lastExecutedChain: string;
  packageName: string;
  dataStreamName: string;
  errors: object;
  pipelineResults: object[];
  finalized: boolean;
  reviewed: boolean;
  currentPipeline: object;
  currentProcessors: object[];
  invalidCategorization: object;
  initialPipeline: object;
  results: object;
}

export interface EcsMappingState {
  ecs: string;
  lastExecutedChain: string;
  rawSamples: string[];
  samples: string[];
  formattedSamples: string;
  exAnswer: string;
  packageName: string;
  dataStreamName: string;
  finalized: boolean;
  currentMapping: object;
  currentPipeline: object;
  duplicateFields: string[];
  missingKeys: string[];
  invalidEcsFields: string[];
  results: object;
  logFormat: string;
  ecsVersion: string;
}

export interface RelatedState {
  rawSamples: string[];
  samples: string[];
  formattedSamples: string;
  ecs: string;
  exAnswer: string;
  packageName: string;
  dataStreamName: string;
  errors: object;
  pipelineResults: object[];
  finalized: boolean;
  reviewed: boolean;
  currentPipeline: object;
  currentProcessors: object[];
  initialPipeline: object;
  results: object;
  lastExecutedChain: string;
}
