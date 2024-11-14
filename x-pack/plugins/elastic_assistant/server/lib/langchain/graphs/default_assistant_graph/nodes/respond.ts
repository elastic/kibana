/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StringWithAutocomplete } from '@langchain/core/dist/utils/types';
import { AGENT_NODE_TAG } from './run_agent';
import { AgentState, NodeParamsBase } from '../types';
import { NodeType } from '../constants';

export interface RespondParams extends NodeParamsBase {
  state: AgentState;
  model: BaseChatModel;
}

export async function respond({
  logger,
  state,
  model,
}: RespondParams): Promise<Partial<AgentState>> {
  logger.debug(() => `${NodeType.RESPOND}: Node state:\n${JSON.stringify(state, null, 2)}`);

  if (state?.agentOutcome && 'returnValues' in state.agentOutcome) {
    console.log('user message??', state.agentOutcome?.returnValues?.output);
    const value = Array.isArray(state.agentOutcome?.returnValues?.output)
      ? state.agentOutcome?.returnValues?.output.reduce((acc, i) => `${acc}${i.text}`, '')
      : state.agentOutcome?.returnValues?.output;
    console.log('value??', value);
    const userMessage = [
      'user',
      `Respond exactly with
    ${value}

    Do not verify, confirm or anything else. Just reply with the same content as provided above.`,
    ] as [StringWithAutocomplete<'user'>, string];

    const responseMessage = await model
      // use AGENT_NODE_TAG to identify as agent node for stream parsing
      .withConfig({ runName: 'Summarizer', tags: [AGENT_NODE_TAG] })
      .invoke([userMessage]);

    return {
      agentOutcome: {
        ...state.agentOutcome,
        returnValues: {
          output: responseMessage.content,
        },
      },
      lastNode: NodeType.RESPOND,
    };
  }
  return { lastNode: NodeType.RESPOND };
}
