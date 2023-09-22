/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { BaseMessage } from 'langchain/schema';

import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { ResponseBody } from '../helpers';
import { ActionsClientLlm } from '../llm/actions_client_llm';
import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { KNOWLEDGE_BASE_INDEX_PATTERN } from '../../../routes/knowledge_base/constants';

export const executeCustomLlmChain = async ({
  actions,
  connectorId,
  esClient,
  langChainMessages,
  logger,
  request,
}: {
  actions: ActionsPluginStart;
  connectorId: string;
  esClient: ElasticsearchClient;
  langChainMessages: BaseMessage[];
  logger: Logger;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<unknown, unknown, any, any>;
}): Promise<ResponseBody> => {
  const llm = new ActionsClientLlm({ actions, connectorId, request, logger });

  // Chat History Memory: in-memory memory, from client local storage, first message is the system prompt
  const pastMessages = langChainMessages.slice(0, -1); // all but the last message
  const latestMessage = langChainMessages.slice(-1); // the last message
  const memory = new BufferMemory({
    chatHistory: new ChatMessageHistory(pastMessages),
    memoryKey: 'chat_history',
  });

  // ELSER backed ElasticsearchStore for Knowledge Base
  const esStore = new ElasticsearchStore(esClient, KNOWLEDGE_BASE_INDEX_PATTERN, logger);

  // Chain w/ chat history memory and knowledge base retriever
  const chain = ConversationalRetrievalQAChain.fromLLM(llm, esStore.asRetriever(), {
    memory,
    // See `qaChainOptions` from https://js.langchain.com/docs/modules/chains/popular/chat_vector_db
    qaChainOptions: { type: 'stuff' },
  });
  await chain.call({ question: latestMessage[0].content });

  // Chain w/ just knowledge base retriever
  // const chain = RetrievalQAChain.fromLLM(llm, esStore.asRetriever());
  // await chain.call({ query: latestMessage[0].content });

  // The assistant (on the client side) expects the same response returned
  // from the actions framework, so we need to return the same shape of data:
  return {
    connector_id: connectorId,
    data: llm.getActionResultData(), // the response from the actions framework
    status: 'ok',
  };
};
