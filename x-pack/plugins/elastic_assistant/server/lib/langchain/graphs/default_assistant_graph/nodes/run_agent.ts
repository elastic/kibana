/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunnableConfig } from '@langchain/core/runnables';
import { AgentRunnableSequence } from 'langchain/dist/agents/agent';
import { AgentState, NodeParamsBase } from '../types';
import { AssistantDataClients } from '../../../executors/types';

export interface RunAgentParams extends NodeParamsBase {
  agentRunnable: AgentRunnableSequence;
  dataClients?: AssistantDataClients;
  state: AgentState;
  config?: RunnableConfig;
}

export const AGENT_NODE = 'agent';

const NO_HISTORY = '[No existing knowledge history]';
/**
 * Node to run the agent
 *
 * @param agentRunnable - The agent to run
 * @param config - Any configuration that may've been supplied
 * @param logger - The scoped logger
 * @param dataClients - Data clients available for use
 * @param state - The current state of the graph
 */
export const runAgent = async ({
  agentRunnable,
  config,
  dataClients,
  logger,
  state,
}: RunAgentParams) => {
  logger.debug(`Node state:\n${JSON.stringify(state, null, 2)}`);

  const knowledgeHistory = await dataClients?.kbDataClient?.getKnowledgeBaseDocuments({
    kbResource: 'user',
    required: true,
    query: '',
  });

  const agentOutcome = await agentRunnable.invoke(
    {
      ...state,
      chat_history: state.messages, // TODO: Message de-dupe with ...state spread
      knowledge_history: knowledgeHistory?.length ? knowledgeHistory : NO_HISTORY,
    },
    config
  );
  return {
    agentOutcome,
  };
};
