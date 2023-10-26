/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { RetrievalQAChain } from 'langchain/chains';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { ChainTool, Tool } from 'langchain/tools';

import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { ActionsClientLlm } from '../llm/actions_client_llm';
import { KNOWLEDGE_BASE_INDEX_PATTERN } from '../../../routes/knowledge_base/constants';
import type { AgentExecutorParams, AgentExecutorResponse } from '../executors/types';

export const callAgentExecutor = async ({
  actions,
  connectorId,
  esClient,
  langChainMessages,
  llmType,
  logger,
  request,
  elserId,
  kbResource,
}: AgentExecutorParams): AgentExecutorResponse => {
  const llm = new ActionsClientLlm({ actions, connectorId, request, llmType, logger });

  const pastMessages = langChainMessages.slice(0, -1); // all but the last message
  const latestMessage = langChainMessages.slice(-1); // the last message

  const memory = new BufferMemory({
    chatHistory: new ChatMessageHistory(pastMessages),
    memoryKey: 'chat_history', // this is the key expected by https://github.com/langchain-ai/langchainjs/blob/a13a8969345b0f149c1ca4a120d63508b06c52a5/langchain/src/agents/initialize.ts#L166
    inputKey: 'input',
    outputKey: 'output',
    returnMessages: true,
  });

  // ELSER backed ElasticsearchStore for Knowledge Base
  const esStore = new ElasticsearchStore(
    esClient,
    KNOWLEDGE_BASE_INDEX_PATTERN,
    logger,
    elserId,
    kbResource
  );

  const modelExists = await esStore.isModelInstalled();
  if (!modelExists) {
    throw new Error(
      'Please ensure ELSER is configured to use the Knowledge Base, otherwise disable the Knowledge Base in Advanced Settings to continue.'
    );
  }

  const chain = RetrievalQAChain.fromLLM(llm, esStore.asRetriever());

  const tools: Tool[] = [
    new ChainTool({
      name: 'esql-language-knowledge-base',
      description:
        'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language.',
      chain,
    }),
  ];

  const executor = await initializeAgentExecutorWithOptions(tools, llm, {
    agentType: 'chat-conversational-react-description',
    memory,
    verbose: false,
  });

  await executor.call({ input: latestMessage[0].content });

  return {
    connector_id: connectorId,
    data: llm.getActionResultData(), // the response from the actions framework
    status: 'ok',
  };
};
