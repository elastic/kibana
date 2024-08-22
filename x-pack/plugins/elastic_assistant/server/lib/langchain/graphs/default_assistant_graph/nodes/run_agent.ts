/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunnableConfig } from '@langchain/core/runnables';
import { AgentRunnableSequence } from 'langchain/dist/agents/agent';
import { AgentState, NodeParamsBase } from '../types';
import { NodeType } from '../constants';

export interface RunAgentParams extends NodeParamsBase {
  state: AgentState;
  config?: RunnableConfig;
  agentRunnable: AgentRunnableSequence;
}

export const AGENT_NODE_TAG = 'agent_run';

/**
 * Node to run the agent
 *
 * @param logger - The scoped logger
 * @param state - The current state of the graph
 * @param config - Any configuration that may've been supplied
 * @param agentRunnable - The agent to run
 */
export async function runAgent({
  logger,
  state,
  agentRunnable,
  config,
}: RunAgentParams): Promise<Partial<AgentState>> {
  logger.debug(() => `${NodeType.AGENT}: Node state:\n${JSON.stringify(state, null, 2)}`);

  const agentOutcome = await agentRunnable.withConfig({ tags: [AGENT_NODE_TAG] }).invoke(
    {
      ...state,
      chat_history: state.messages, // TODO: Message de-dupe with ...state spread
    },
    config
  );

  return {
    agentOutcome,
    lastNode: NodeType.AGENT,
  };
}
