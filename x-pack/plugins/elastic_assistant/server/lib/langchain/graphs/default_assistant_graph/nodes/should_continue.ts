/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEW_CHAT } from '../../../../../routes/helpers';
import { AgentState, NodeParamsBase } from '../types';

export interface ShouldContinueParams extends NodeParamsBase {
  state: AgentState;
}

/**
 * Node to determine which conditional edge to choose. Essentially the 'router' node.
 *
 * @param logger - The scoped logger
 * @param state - The current state of the graph
 */
export const shouldContinue = ({ logger, state }: ShouldContinueParams) => {
  logger.debug(() => `Node state:\n${JSON.stringify(state, null, 2)}`);

  if (state.agentOutcome && 'returnValues' in state.agentOutcome) {
    return 'end';
  }

  return 'continue';
};

export const shouldContinueGenerateTitle = ({ logger, state }: ShouldContinueParams) => {
  logger.debug(`Node state:\n${JSON.stringify(state, null, 2)}`);

  if (state.conversation?.title?.length && state.conversation?.title !== NEW_CHAT) {
    return 'end';
  }

  return 'continue';
};

export interface ShouldContinueGetConversation extends NodeParamsBase {
  state: AgentState;
  conversationId?: string;
}
export const shouldContinueGetConversation = ({
  logger,
  state,
  conversationId,
}: ShouldContinueGetConversation) => {
  logger.debug(`Node state:\n${JSON.stringify(state, null, 2)}`);

  if (!conversationId) {
    return 'end';
  }

  return 'continue';
};
