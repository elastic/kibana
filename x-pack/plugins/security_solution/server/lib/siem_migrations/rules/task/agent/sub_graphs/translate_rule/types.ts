/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EditorError } from '@kbn/esql-ast';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import type { ChatModel } from '../../../util/actions_client_chat';
import type { IntegrationRetriever } from '../../../util/integration_retriever';
import type { RuleResourceRetriever } from '../../../util/rule_resource_retriever';
import type { translateRuleState } from './state';

export type TranslateRuleState = typeof translateRuleState.State;
export type GraphNode = (state: TranslateRuleState) => Promise<Partial<TranslateRuleState>>;

export interface TranslateRuleGraphParams {
  inferenceClient: InferenceClient;
  model: ChatModel;
  connectorId: string;
  resourceRetriever: RuleResourceRetriever;
  integrationRetriever: IntegrationRetriever;
  logger: Logger;
}

export interface TranslateRuleValidationErrors {
  iterations: number;
  esql_errors?: EditorError[];
}
