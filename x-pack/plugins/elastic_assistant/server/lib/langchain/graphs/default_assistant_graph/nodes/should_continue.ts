/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  logger.debug(`Node state:\n${JSON.stringify(state, null, 2)}`);

  if (state.agentOutcome && 'returnValues' in state.agentOutcome) {
    return 'end';
  }

  return 'continue';
};
