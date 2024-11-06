/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunnableConfig } from '@langchain/core/runnables';
import { AgentRunnableSequence } from 'langchain/dist/agents/agent';
import { formatLatestUserMessage } from '../prompts';
import { AgentState, NodeParamsBase } from '../types';
import { NodeType } from '../constants';
import { AIAssistantKnowledgeBaseDataClient } from '../../../../../ai_assistant_data_clients/knowledge_base';

export interface RunAgentParams extends NodeParamsBase {
  state: AgentState;
  config?: RunnableConfig;
  agentRunnable: AgentRunnableSequence;
  kbDataClient?: AIAssistantKnowledgeBaseDataClient;
}

export const AGENT_NODE_TAG = 'agent_run';

const KNOWLEDGE_HISTORY_PREFIX = 'Knowledge History:';
const NO_KNOWLEDGE_HISTORY = '[No existing knowledge history]';

/**
 * Node to run the agent
 *
 * @param logger - The scoped logger
 * @param state - The current state of the graph
 * @param config - Any configuration that may've been supplied
 * @param agentRunnable - The agent to run
 * @param kbDataClient -  Data client for accessing the Knowledge Base on behalf of the current user
 */
export async function runAgent({
  logger,
  state,
  agentRunnable,
  config,
  kbDataClient,
}: RunAgentParams): Promise<Partial<AgentState>> {
  logger.debug(() => `${NodeType.AGENT}: Node state:\n${JSON.stringify(state, null, 2)}`);

  const knowledgeHistory = await kbDataClient?.getRequiredKnowledgeBaseDocumentEntries();

  const agentOutcome = await agentRunnable.withConfig({ tags: [AGENT_NODE_TAG] }).invoke(
    {
      ...state,
      knowledge_history: `${KNOWLEDGE_HISTORY_PREFIX}\n${
        knowledgeHistory?.length
          ? JSON.stringify(knowledgeHistory.map((e) => e.text))
          : NO_KNOWLEDGE_HISTORY
      }`,
      // prepend any user prompt (gemini)
      input: formatLatestUserMessage(state.input, state.llmType),
      chat_history: state.messages, // TODO: Message de-dupe with ...state spread
    },
    config
  );

  return {
    agentOutcome,
    lastNode: NodeType.AGENT,
  };
}
