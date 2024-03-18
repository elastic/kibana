/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutor } from './types';
import { callAgentExecutor } from '../execute_custom_llm_chain';
import { callOpenAIFunctionsExecutor } from './openai_functions_executor';

/**
 * To support additional Agent Executors from the UI, add them to this map
 * and reference your specific AgentExecutor function
 */
export const AGENT_EXECUTOR_MAP: Record<string, AgentExecutor> = {
  DefaultAgentExecutor: callAgentExecutor,
  OpenAIFunctionsExecutor: callOpenAIFunctionsExecutor,
};
