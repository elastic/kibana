/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AgentState } from '../types';

export const RESPOND_NODE = 'respond';
export const respond = async ({ llm, state }: { llm: BaseChatModel; state: AgentState }) => {
  // Assign the final model call a run name
  // console.error('state', state);
  // const { messages } = state;
  const userMessage = [
    'user',
    `Respond exactly with
    ${state.agentOutcome?.returnValues?.output}

    Do not verify, confirm or anything else. Just reply with the same content as provided above.`,
  ];
  // console.error('messages', messages);
  // console.error('userMessage', userMessage);
  const responseMessage = await llm
    // .bindTools([])
    .withConfig({ runName: 'Summarizer' })
    .invoke([userMessage]);

  return {
    agentOutcome: {
      returnValues: {
        output: responseMessage.content,
      },
    },
  };
};
