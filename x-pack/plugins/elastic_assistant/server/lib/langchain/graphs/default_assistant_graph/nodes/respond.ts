/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StringWithAutocomplete } from '@langchain/core/dist/utils/types';
import { AGENT_NODE_TAG } from './run_agent';
import { AgentState } from '../types';

export const RESPOND_NODE = 'respond';
export const respond = async ({ llm, state }: { llm: BaseChatModel; state: AgentState }) => {
  if (state?.agentOutcome && 'returnValues' in state.agentOutcome) {
    const userMessage = [
      'user',
      `Respond exactly with
    ${state.agentOutcome?.returnValues?.output}

    Do not verify, confirm or anything else. Just reply with the same content as provided above.`,
    ] as [StringWithAutocomplete<'user'>, string];

    const responseMessage = await llm
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
    };
  }
  return state;
};
