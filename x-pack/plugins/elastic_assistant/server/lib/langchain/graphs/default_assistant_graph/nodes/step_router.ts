/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '../constants';
import { AgentState } from '../types';
import { NEW_CHAT } from '../../../../../routes/helpers';

/*
 * We use a single router endpoint for common conditional edges.
 * This allows for much easier extension later, where one node might want to go back and validate with an earlier node
 * or to a new node that's been added to the graph.
 * More routers could always be added later when needed.
 */
export function stepRouter(state: AgentState): string {
  switch (state.lastNode) {
    case NodeType.AGENT:
      if (state.agentOutcome && 'returnValues' in state.agentOutcome) {
        return state.hasRespondStep ? NodeType.RESPOND : NodeType.END;
      }
      return NodeType.TOOLS;

    case NodeType.GET_PERSISTED_CONVERSATION:
      if (state.conversation?.title?.length && state.conversation?.title !== NEW_CHAT) {
        return NodeType.PERSIST_CONVERSATION_CHANGES;
      }
      return NodeType.GENERATE_CHAT_TITLE;

    case NodeType.MODEL_INPUT:
      return state.conversationId ? NodeType.GET_PERSISTED_CONVERSATION : NodeType.AGENT;

    default:
      return NodeType.END;
  }
}
