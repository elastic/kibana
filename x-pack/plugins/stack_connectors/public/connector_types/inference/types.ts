/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../common/inference/constants';
import {
  ChatCompleteParams,
  RerankParams,
  SparseEmbeddingParams,
  TextEmbeddingParams,
} from '../../../common/inference/types';
import { ConfigEntryView, ConfigProperties } from '../lib/dynamic_config/types';

export interface InferenceActionParams {
  subAction:
    | SUB_ACTION.COMPLETION
    | SUB_ACTION.RERANK
    | SUB_ACTION.SPARSE_EMBEDDING
    | SUB_ACTION.TEXT_EMBEDDING;
  subActionParams: ChatCompleteParams | RerankParams | SparseEmbeddingParams | TextEmbeddingParams;
}

export enum ServiceProviderKeys {
  amazonbedrock = 'amazonbedrock',
  azureopenai = 'azureopenai',
  azureaistudio = 'azureaistudio',
  cohere = 'cohere',
  elasticsearch = 'elasticsearch',
  elser = 'elser',
  googleaistudio = 'googleaistudio',
  googlevertexai = 'googlevertexai',
  hugging_face = 'hugging_face',
  mistral = 'mistral',
  openai = 'openai',
  anthropic = 'anthropic',
}

export type FieldsConfiguration = Record<string, ConfigProperties>;

export interface Config {
  taskType: string;
  taskTypeSchema?: ConfigEntryView[];
  taskTypeConfig?: Record<string, unknown>;
  inferenceId: string;
  provider: string;
  providerConfig?: Record<string, unknown>;
  providerSchema: ConfigEntryView[];
}

export interface Secrets {
  providerSecrets?: Record<string, unknown>;
}

export type InferenceConnector = ConnectorTypeModel<Config, Secrets, InferenceActionParams>;

export type InferenceActionConnector = UserConfiguredActionConnector<Config, Secrets>;
