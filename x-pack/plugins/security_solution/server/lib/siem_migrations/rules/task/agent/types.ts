/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import type { migrateRuleState } from './state';
import type { ChatModel } from '../util/actions_client_chat';
import type { PrebuiltRulesMapByName } from '../util/prebuilt_rules';
import type { RuleResourceRetriever } from '../util/rule_resource_retriever';

export type MigrateRuleState = typeof migrateRuleState.State;
export type GraphNode = (state: MigrateRuleState) => Promise<Partial<MigrateRuleState>>;

export interface MigrateRuleGraphParams {
  inferenceClient: InferenceClient;
  model: ChatModel;
  connectorId: string;
  prebuiltRulesMap: PrebuiltRulesMapByName;
  resourceRetriever: RuleResourceRetriever;
  logger: Logger;
}
