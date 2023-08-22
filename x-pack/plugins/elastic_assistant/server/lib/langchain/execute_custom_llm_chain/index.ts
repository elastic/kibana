/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

import { ConversationChain } from 'langchain/chains';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { BaseMessage } from 'langchain/schema';

import { ActionsClientLlm } from '../llm/actions_client_llm';
import { ResponseBody } from '../helpers';

export const executeCustomLlmChain = async ({
  actions,
  connectorId,
  langchainMessages,
  request,
}: {
  actions: ActionsPluginStart;
  connectorId: string;
  langchainMessages: BaseMessage[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<unknown, unknown, any, any>;
}): Promise<ResponseBody> => {
  const llm = new ActionsClientLlm({ actions, connectorId, request });

  const pastMessages = langchainMessages.slice(0, -1); // all but the last message
  const latestMessage = langchainMessages.slice(-1); // the last message

  const memory = new BufferMemory({
    chatHistory: new ChatMessageHistory(pastMessages),
  });

  const chain = new ConversationChain({ llm, memory });

  await chain.call({ input: latestMessage[0].content }); // kick off the chain with the last message

  // The assistant (on the client side) expects the same response returned
  // from the actions framework, so we need to return the same shape of data:
  const responseBody = {
    connector_id: connectorId,
    data: llm.getActionResultData(), // the response from the actions framework
    status: 'ok',
  };

  return responseBody;
};
