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
import { HttpResponseOutputParser } from 'langchain/output_parsers';

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
  const llm = new ActionsClientLlm({
    actions,
    connectorId,
    request,
    llmType,
    logger,
    streaming: true,
  });

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

  // Create a chain that uses the ELSER backed ElasticsearchStore, override k=10 for esql query generation for now
  const chain = RetrievalQAChain.fromLLM(llm, esStore.asRetriever(10));

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
    // agentType: 'zero-shot-react-description',
    returnIntermediateSteps: true,
    memory,
    verbose: true,
    agentArgs: {
      outputParser: HttpResponseOutputParser,
    },
  });

  console.log('THIS SHOULD BE before stream call');
  const resp = await executor.stream({ input: latestMessage[0].content, chat_history: [] });
  console.log('THIS SHOULD BE after stream call', { resp, stream: llm.getActionResultStream() });
  return resp;
};
