/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { StructuredTool } from '@langchain/core/tools';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import type { ChatModel } from './actions_client_chat';
import type { migrateRuleState } from './state';

export type MigrateRuleState = typeof migrateRuleState.State;

export interface MigrateRuleGraphParams {
  model: ChatModel;
  tools: StructuredTool[];
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}
