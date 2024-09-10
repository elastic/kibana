/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionsClientBedrockChatModel,
  ActionsClientChatOpenAI,
  ActionsClientGeminiChatModel,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { SamplesFormat } from '../common';

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

export interface SimplifiedProcessor {
  if?: string;
  field: string;
  value_from?: string;
  value?: string;
}

export interface SimplifiedProcessors {
  type: string;
  processors: SimplifiedProcessor[];
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
  previousError: string;
  pipelineResults: object[];
  finalized: boolean;
  reviewed: boolean;
  hasTriedOnce: boolean;
  currentPipeline: object;
  currentProcessors: object[];
  invalidCategorization: object[];
  previousInvalidCategorization: string;
  initialPipeline: object;
  results: object;
}

export interface EcsMappingState {
  ecs: string;
  chunkSize: number;
  lastExecutedChain: string;
  rawSamples: string[];
  prefixedSamples: string[];
  combinedSamples: string;
  sampleChunks: string[];
  exAnswer: string;
  packageName: string;
  dataStreamName: string;
  finalized: boolean;
  currentMapping: object;
  finalMapping: object;
  chunkMapping: object;
  useFinalMapping: boolean;
  hasTriedOnce: boolean;
  currentPipeline: object;
  duplicateFields: string[];
  missingKeys: string[];
  invalidEcsFields: string[];
  results: object;
  samplesFormat: string;
  ecsVersion: string;
}

export interface LogFormatDetectionState {
  lastExecutedChain: string;
  logSamples: string[];
  exAnswer: string;
  finalized: boolean;
  samplesFormat: SamplesFormat;
  ecsVersion: string;
  results: object;
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
  previousError: string;
  pipelineResults: object[];
  finalized: boolean;
  reviewed: boolean;
  hasTriedOnce: boolean;
  currentPipeline: object;
  currentProcessors: object[];
  initialPipeline: object;
  results: object;
  lastExecutedChain: string;
}

export type ChatModels =
  | ActionsClientChatOpenAI
  | ActionsClientBedrockChatModel
  | ActionsClientSimpleChatModel
  | ActionsClientGeminiChatModel;
