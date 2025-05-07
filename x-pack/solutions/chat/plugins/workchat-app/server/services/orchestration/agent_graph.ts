/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { Logger } from '@kbn/core/server';
import type { ContentRef } from '@kbn/wci-common';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { type McpGatewaySession, ToolsProvider } from './mcp_gateway';
import type { Agent } from '../../../common/agents';
import { withSystemPrompt } from './prompts';
import { extractCitations } from './utils';

export const createAgentGraph = async ({
  agent,
  chatModel,
  session,
  logger,
}: {
  agent: Agent;
  chatModel: InferenceChatModel;
  session: McpGatewaySession;
  logger: Logger;
}) => {
  const StateAnnotation = Annotation.Root({
    // inputs
    initialMessages: Annotation<BaseMessage[]>({
      reducer: messagesStateReducer,
      default: () => [],
    }),
    // outputs
    addedMessages: Annotation<BaseMessage[]>({
      reducer: messagesStateReducer,
      default: () => [],
    }),
    citations: Annotation<ContentRef[]>({
      reducer: (a = [], b = []) => [...a, ...b],
      default: () => [],
    }),
  });

  const toolsProvider = new ToolsProvider({ session, logger });

  const allTools = await toolsProvider.getAllTools();

  const tools = [...allTools];
  const toolNode = new ToolNode<typeof StateAnnotation.State.addedMessages>(tools);

  const model = chatModel.bindTools(tools).withConfig({
    tags: ['workflow', `agent:${agent.id}`],
  });

  const callModel = async (state: typeof StateAnnotation.State) => {
    const response = await model.invoke(
      await withSystemPrompt({
        agentPrompt: agent.configuration.systemPrompt,
        messages: [...state.initialMessages, ...state.addedMessages],
      })
    );
    return {
      addedMessages: [response],
    };
  };

  const shouldContinue = async (state: typeof StateAnnotation.State) => {
    const messages = state.addedMessages;
    const lastMessage: AIMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.tool_calls?.length) {
      return 'tools';
    }
    return '__end__';
  };

  const toolHandler = async (state: typeof StateAnnotation.State) => {
    const toolNodeResult = await toolNode.invoke(state.addedMessages);
    const citations = extractCitations({ messages: toolNodeResult });
    return {
      addedMessages: [...toolNodeResult],
      citations,
    };
  };

  const graph = new StateGraph(StateAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolHandler)
    .addEdge('__start__', 'agent')
    .addEdge('tools', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      __end__: '__end__',
    })
    .compile();

  return graph;
};
