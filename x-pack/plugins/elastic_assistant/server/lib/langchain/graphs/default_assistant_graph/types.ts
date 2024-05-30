/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage } from '@langchain/core/messages';
import { AgentAction, AgentFinish, AgentStep } from '@langchain/core/agents';

export interface AgentStateBase {
  agentOutcome?: AgentAction | AgentFinish;
  steps: AgentStep[];
}

export interface AgentState extends AgentStateBase {
  input: string;
  messages: BaseMessage[];
}
