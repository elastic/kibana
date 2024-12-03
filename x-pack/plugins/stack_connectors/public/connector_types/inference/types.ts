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

export type InferenceActionParams =
  | { subAction: SUB_ACTION.COMPLETION; subActionParams: ChatCompleteParams }
  | { subAction: SUB_ACTION.RERANK; subActionParams: RerankParams }
  | { subAction: SUB_ACTION.SPARSE_EMBEDDING; subActionParams: SparseEmbeddingParams }
  | { subAction: SUB_ACTION.TEXT_EMBEDDING; subActionParams: TextEmbeddingParams };

export interface Config {
  taskType: string;
  taskTypeConfig?: Record<string, unknown>;
  inferenceId: string;
  provider: string;
  providerConfig?: Record<string, unknown>;
}

export interface Secrets {
  providerSecrets?: Record<string, unknown>;
}

export type InferenceConnector = ConnectorTypeModel<Config, Secrets, InferenceActionParams>;

export type InferenceActionConnector = UserConfiguredActionConnector<Config, Secrets>;
