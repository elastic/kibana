/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunnableConfig } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { ToolExecutor } from '@langchain/langgraph/prebuilt';
import { AgentState, NodeParamsBase } from '../types';

export interface ExecuteToolsParams extends NodeParamsBase {
  state: AgentState;
  config?: RunnableConfig;
  tools: StructuredTool[];
}

export const TOOLS_NODE = 'tools';

/**
 * Node to execute tools
 *
 * Note: Could maybe leverage `ToolNode` if tool selection state is pushed to `messages[]`.
 * See: https://github.com/langchain-ai/langgraphjs/blob/0ef76d603b55c00a04f5793d1e6ab15af7c756cb/langgraph/src/prebuilt/tool_node.ts
 *
 * @param config - Any configuration that may've been supplied
 * @param logger - The scoped logger
 * @param state - The current state of the graph
 * @param tools - The tools available to execute
 */
export const executeTools = async ({ config, logger, state, tools }: ExecuteToolsParams) => {
  logger.debug(() => `Node state:\n${JSON.stringify(state, null, 2)}`);

  const toolExecutor = new ToolExecutor({ tools });
  const agentAction = state.agentOutcome;

  if (!agentAction || 'returnValues' in agentAction) {
    throw new Error('Agent has not been run yet');
  }
  const out = await toolExecutor.invoke(agentAction, config);
  return {
    steps: [{ action: agentAction, observation: JSON.stringify(out, null, 2) }],
  };
};
