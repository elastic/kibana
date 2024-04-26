/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { RetrievalQAChain } from 'langchain/chains';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { ChainTool } from 'langchain/tools/chain';

import { ActionsClientLlm } from '@kbn/elastic-assistant-common/impl/language_models';
import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { KNOWLEDGE_BASE_INDEX_PATTERN } from '../../../routes/knowledge_base/constants';
import { AgentExecutor } from './types';
import { withAssistantSpan } from '../tracers/with_assistant_span';
import { APMTracer } from '../tracers/apm_tracer';

export const OPEN_AI_FUNCTIONS_AGENT_EXECUTOR_ID =
  'Elastic AI Assistant Agent Executor (OpenAI Functions)';

/**
 * This is an agent executor to be used with the model evaluation API for benchmarking.
 * Currently just a copy of `callAgentExecutor`, but using the `openai-functions` agent type.
 *
 * NOTE: This is not to be used in production as-is, and must be used with an OpenAI ConnectorId
 */
export const callOpenAIFunctionsExecutor: AgentExecutor<false> = async ({
  actions,
  connectorId,
  esClient,
  langChainMessages,
  llmType,
  logger,
  request,
  elserId,
  kbResource,
  telemetry,
  traceOptions,
}) => {
  const llm = new ActionsClientLlm({
    actions,
    connectorId,
    request,
    llmType,
    logger,
    model: request.body.model,
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
    telemetry,
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

  // TODO: Dependency inject these tools
  const tools = [
    new ChainTool({
      name: 'ESQLKnowledgeBaseTool',
      description:
        'Call this for knowledge on how to build an ESQL query, or answer questions about the ES|QL query language.',
      chain,
      tags: ['esql', 'query-generation', 'knowledge-base'],
    }),
  ];

  const executor = await initializeAgentExecutorWithOptions(tools, llm, {
    agentType: 'openai-functions',
    memory,
    verbose: false,
  });

  // Sets up tracer for tracing executions to APM. See x-pack/plugins/elastic_assistant/server/lib/langchain/tracers/README.mdx
  // If LangSmith env vars are set, executions will be traced there as well. See https://docs.smith.langchain.com/tracing
  const apmTracer = new APMTracer({ projectName: traceOptions?.projectName ?? 'default' }, logger);

  let traceData;

  // Wrap executor call with an APM span for instrumentation
  const langChainResponse = await withAssistantSpan(
    OPEN_AI_FUNCTIONS_AGENT_EXECUTOR_ID,
    async (span) => {
      if (span?.transaction?.ids['transaction.id'] != null && span?.ids['trace.id'] != null) {
        traceData = {
          // Transactions ID since this span is the parent
          transaction_id: span.transaction.ids['transaction.id'],
          trace_id: span.ids['trace.id'],
        };
        span.addLabels({ evaluationId: traceOptions?.evaluationId });
      }

      return executor.call(
        { input: latestMessage[0].content },
        {
          callbacks: [apmTracer, ...(traceOptions?.tracers ?? [])],
          runName: OPEN_AI_FUNCTIONS_AGENT_EXECUTOR_ID,
          tags: traceOptions?.tags ?? [],
        }
      );
    }
  );

  return {
    body: {
      connector_id: connectorId,
      data: langChainResponse.output, // the response from the actions framework
      trace_data: traceData,
      status: 'ok',
    },
    headers: {
      'content-type': 'application/json',
    },
    connector_id: connectorId,
    data: langChainResponse.output, // the response from the actions framework
    trace_data: traceData,
    status: 'ok',
  };
};
