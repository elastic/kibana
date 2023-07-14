/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum OpenAIProvider {
  OpenAI = 'openAI',
  AzureOpenAI = 'azureOpenAI',
}

export enum CoPilotPromptId {
  ProfilingOptimizeFunction = 'profilingOptimizeFunction',
  ApmExplainError = 'apmExplainError',
  LogsExplainMessage = 'logsExplainMessage',
  LogsFindSimilar = 'logsFindSimilar',
  InfraExplainProcess = 'infraExplainProcess',
  ExplainLogSpike = 'explainLogSpike',
}

export type {
  CoPilotPromptMap,
  CreateChatCompletionResponseChunk,
  PromptParamsOf,
} from './prompts';

export const loadCoPilotPrompts = () => import('./prompts').then((m) => m.coPilotPrompts);
