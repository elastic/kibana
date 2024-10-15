/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatModel } from '../../../../actions_client_chat';
import type { ESQLKnowledgeBaseTool } from './tools/esql_knowledge_base_tool';
import type { translateRuleState } from './state';

export type TranslateRuleState = typeof translateRuleState.State;

export interface TranslateRuleGraphParams {
  model: ChatModel;
  esqlKnowledgeBaseTool: ESQLKnowledgeBaseTool;
}

export interface TranslateRuleNodeParams {
  model: ChatModel;
  state: TranslateRuleState;
}
