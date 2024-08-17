/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { END } from '@langchain/langgraph';
import { NodeType } from '../constants';
import { NodeParamsBase, AgentState } from '../types';
import { NEW_CHAT } from '../../../../../routes/helpers';

interface RouterParams extends NodeParamsBase {
  state: AgentState;
}

/*
 * We use a single router endpoint for the conditional edges.
 * This allows for much easier extension later, where one node might want to go back and validate with an earlier node
 * or to a new node that's been added to the graph.
 *
 * @param logger - The scoped logger
 * @param state - The current state of the graph
 */
export function stepRouter({ logger, state }: RouterParams): string {
  logger.debug(() => `${NodeType.STEP_ROUTER}: Node state:\n${JSON.stringify(state, null, 2)}`);

  // All possible conditional edges when source node is the Agent node
  if (state.lastNode === NodeType.AGENT) {
    if (state.agentOutcome && 'returnValues' in state.agentOutcome) {
      return state.hasRespondStep ? NodeType.RESPOND : END;
    }
    return NodeType.TOOLS;
  }
  // All possible conditional edges when source node is the GetPersistedConversation node
  if (state.lastNode === NodeType.GET_PERSISTED_CONVERSATION) {
    if (state.conversation?.title?.length && state.conversation?.title !== NEW_CHAT) {
      return NodeType.PERSIST_CONVERSATION_CHANGES;
    }
    return NodeType.GENERATE_CHAT_TITLE;
  }
  // All possible conditional edges when source node is the ModelInput node
  if (state.lastNode === NodeType.MODEL_INPUT) {
    if (!state.conversationId) {
      return NodeType.AGENT;
    }
    return NodeType.GET_PERSISTED_CONVERSATION;
  }

  return END;
}
