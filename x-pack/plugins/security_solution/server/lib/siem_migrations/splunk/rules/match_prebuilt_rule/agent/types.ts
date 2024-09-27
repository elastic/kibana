/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatModel } from '../../../../actions_client_chat';
import type { matchPrebuiltRuleState } from './state';

export type MatchPrebuiltRuleState = typeof matchPrebuiltRuleState.State;

export interface MatchPrebuiltRuleGraphParams {
  model: ChatModel;
}

export interface MatchPrebuiltRuleNodeParams {
  model: ChatModel;
  state: MatchPrebuiltRuleState;
}
