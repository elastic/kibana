/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolExecutor } from '@langchain/langgraph/prebuilt';
import { RunnableConfig, RunnableLambda } from '@langchain/core/runnables';
import { END, START, StateGraph, StateGraphArgs } from '@langchain/langgraph';
import { AgentAction, AgentFinish, AgentStep } from '@langchain/core/agents';
import { AgentRunnableSequence } from 'langchain/dist/agents/agent';
import { StructuredTool } from '@langchain/core/tools';
import type { CompiledStateGraph } from '@langchain/langgraph/dist/graph/state';
import type { Logger } from '@kbn/logging';

import { BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AgentState, NodeParamsBase } from './types';
import { generateChatTitle } from './generate_chat_title';
import { AssistantDataClients } from '../../executors/types';

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

    const nodeParams: NodeParamsBase = {
      model: llm,
      logger,
    };

    // Create a tool executor
    const toolExecutor = new ToolExecutor({ tools });

    // Define logic that will be used to determine which conditional edge to go down
    const shouldContinue = (state: AgentState) => {
      logger.debug(`graph:shouldContinue:state\n${JSON.stringify(state, null, 2)}`);
      if (state.agentOutcome && 'returnValues' in state.agentOutcome) {
        return 'end';
      }
      return 'continue';
    };

    const runAgent = async (state: AgentState, config?: RunnableConfig) => {
      logger.debug(`graph:runAgent:\nstate\n${JSON.stringify(state, null, 2)}`);

      const agentOutcome = await agentRunnable.invoke(
        {
          ...state,
          chat_history: messages,
          knowledge_history: 'The users favorite color is blue', // TODO: Plumb through initial retrieval
        },
        config
      );
      return {
        agentOutcome,
      };
    };

    const executeTools = async (state: AgentState, config?: RunnableConfig) => {
      logger.debug(`graph:executeTools:state\n${JSON.stringify(state, null, 2)}`);
      const agentAction = state.agentOutcome;
      if (!agentAction || 'returnValues' in agentAction) {
        throw new Error('Agent has not been run yet');
      }
      const out = await toolExecutor.invoke(agentAction, config);
      return {
        steps: [{ action: agentAction, observation: JSON.stringify(out, null, 2) }],
      };
    };

    // Create a new graph, with the default state from above
    const workflow = new StateGraph<AgentState>({ channels: graphState });

    // Define the nodes to cycle between
    workflow.addNode('generateChatTitle', (state: AgentState) =>
      generateChatTitle({
        state,
        conversationsDataClient: dataClients?.conversationsDataClient,
        conversationId,
        ...nodeParams,
      })
    );
    workflow.addNode('agent', new RunnableLambda({ func: runAgent }));
    workflow.addNode('action', new RunnableLambda({ func: executeTools }));

    // Add conditional edge for determining if we shouldContinue
    workflow.addConditionalEdges('agent', shouldContinue, { continue: 'action', end: END });

    // Add edges for start, and between agent and action (action always followed by agent)
    workflow.addEdge(START, 'generateChatTitle');
    workflow.addEdge('generateChatTitle', 'agent');
    workflow.addEdge('action', 'agent');

    return workflow.compile();
  } catch (e) {
    throw new Error(`Unable to compile DefaultAssistantGraph\n${e}`);
  }
};
