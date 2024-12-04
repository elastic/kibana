/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import type { RuleMigrationsRetriever } from '../../../retrievers';
import type { translateRuleState } from './state';

export type TranslateRuleState = typeof translateRuleState.State;
export type GraphNode = (state: TranslateRuleState) => Promise<Partial<TranslateRuleState>>;

export interface TranslateRuleGraphParams {
  inferenceClient: InferenceClient;
  connectorId: string;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
  logger: Logger;
}

export interface TranslateRuleValidationErrors {
  iterations: number;
  esql_errors?: string;
}
