/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunnableConfig } from '@langchain/core/runnables';
import { END, START, StateGraph, StateGraphArgs } from '@langchain/langgraph';
import { AgentAction, AgentFinish, AgentStep } from '@langchain/core/agents';
import { AgentRunnableSequence } from 'langchain/dist/agents/agent';
import { StructuredTool } from '@langchain/core/tools';
import type { CompiledStateGraph } from '@langchain/langgraph/dist/graph/state';
import type { Logger } from '@kbn/logging';

import { BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AgentState, NodeParamsBase } from './types';
import { AssistantDataClients } from '../../executors/types';
import { shouldContinue } from './nodes/should_continue';
import { AGENT_NODE, runAgent } from './nodes/run_agent';
import { executeTools, TOOLS_NODE } from './nodes/execute_tools';

export const DEFAULT_ASSISTANT_GRAPH_ID = 'Default Security Assistant Graph';

interface GetDefaultAssistantGraphParams {
  agentRunnable: AgentRunnableSequence;
  dataClients?: AssistantDataClients;
  conversationId?: string;
  llm: BaseChatModel;
  logger: Logger;
  messages: BaseMessage[];
  tools: StructuredTool[];
}

/**
 * Returns a compiled default assistant graph
 */
export const getDefaultAssistantGraph = ({
  agentRunnable,
  conversationId,
  dataClients,
  llm,
  logger,
  messages,
  tools,
}: GetDefaultAssistantGraphParams): CompiledStateGraph => {
  try {
    // Default graph state
    const graphState: StateGraphArgs<AgentState>['channels'] = {
      input: {
        value: (x: string, y?: string) => y ?? x,
        default: () => '',
      },
      steps: {
        value: (x: AgentStep[], y: AgentStep[]) => x.concat(y),
        default: () => [],
      },
      agentOutcome: {
        value: (
          x: AgentAction | AgentFinish | undefined,
          y?: AgentAction | AgentFinish | undefined
        ) => y ?? x,
        default: () => undefined,
      },
      messages: {
        value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        default: () => messages,
      },
    };

    // Default node parameters
    const nodeParams: NodeParamsBase = {
      model: llm,
      logger,
    };

    // Create nodes
    // const generateChatTitleNode = (state: AgentState) =>
    //   generateChatTitle({
    //     ...nodeParams,
    //     conversationId,
    //     conversationsDataClient: dataClients?.conversationsDataClient,
    //     logger: logger.get(GENERATE_CHAT_TITLE_NODE),
    //     state,
    //   });
    const runAgentNode = (state: AgentState, config?: RunnableConfig) =>
      runAgent({
        ...nodeParams,
        agentRunnable,
        config,
        dataClients,
        logger: logger.get(AGENT_NODE),
        state,
      });
    const executeToolsNode = (state: AgentState, config?: RunnableConfig) =>
      executeTools({
        ...nodeParams,
        config,
        logger: logger.get(TOOLS_NODE),
        state,
        tools,
      });
    const shouldContinueEdge = (state: AgentState) => shouldContinue({ ...nodeParams, state });

    // Put together a new graph using the nodes and default state from above
    const graph = new StateGraph<AgentState>({ channels: graphState });
    // Define the nodes to cycle between
    // TODO: Re-enable title generation and wire remainder of persistence within graph after https://github.com/elastic/kibana/pull/184485
    // graph.addNode('generateChatTitle', generateChatTitleNode);
    graph.addNode(AGENT_NODE, runAgentNode);
    graph.addNode(TOOLS_NODE, executeToolsNode);
    // Add conditional edge for basic routing
    graph.addConditionalEdges(AGENT_NODE, shouldContinueEdge, { continue: TOOLS_NODE, end: END });
    // Add edges, starting with chat title generation, then alternate between agent and action until finished
    graph.addEdge(START, AGENT_NODE);
    // graph.addEdge('generateChatTitle', AGENT_NODE);
    graph.addEdge(TOOLS_NODE, AGENT_NODE);
    // Compile the graph
    return graph.compile();
  } catch (e) {
    throw new Error(`Unable to compile DefaultAssistantGraph\n${e}`);
  }
};
