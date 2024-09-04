/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../common/inference/constants';
import { ChatCompleteParams } from '../../../common/inference/types';
import { ConfigEntryView } from '../lib/dynamic_config/types';

export interface InferenceActionParams {
  subAction: SUB_ACTION.CHAT_COMPLETE | SUB_ACTION.TEST;
  subActionParams: ChatCompleteParams;
}

export enum ServiceProviderKeys {
  amazonbedrock = 'amazonbedrock',
  azureopenai = 'azureopenai',
  azureaistudio = 'azureaistudio',
  cohere = 'cohere',
  elasticsearch = 'elasticsearch',
  elser = 'elser',
  googleaistudio = 'googleaistudio',
  hugging_face = 'hugging_face',
  mistral = 'mistral',
  openai = 'openai',
}

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
