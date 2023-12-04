/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage } from '@langchain/core/dist/messages';
import { APMTracer } from '../tracers/apm_tracer';
import { withAssistantSpan } from '../tracers/with_assistant_span';
import { ActionsClientLlm } from '../llm/actions_client_llm';
import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { KNOWLEDGE_BASE_INDEX_PATTERN } from '../../../routes/knowledge_base/constants';
import type { AgentExecutorParams, AgentExecutorResponse } from '../executors/types';
import { callConversationalRetrievalChain } from './call_chain';
export const DEFAULT_AGENT_EXECUTOR_ID = 'Elastic AI Assistant Agent Executor';

/**
 * Use an implementation of a ConversationalRetrievalChain to generate
 * output based on retrieved documents.
 *
 */
export const callChainExecutor = async ({
  actions,
  connectorId,
  esClient,
  langChainMessages,
  llmType,
  logger,
  request,
  elserId,
  kbResource,
  traceOptions,
}: AgentExecutorParams): AgentExecutorResponse => {
  const llm = new ActionsClientLlm({
    actions,
    connectorId,
    request,
    llmType,
    logger,
  });

  const pastMessages = langChainMessages.slice(0, -1); // all but the last message
  const latestMessage: BaseMessage = langChainMessages.slice(-1)[0]; // the last message

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

  // Create a retriever that uses the ELSER backed ElasticsearchStore, override k=10 for esql query generation for now
  const retriever = esStore.asRetriever(10);

  const chain = callConversationalRetrievalChain({
    model: llm,
    retriever,
  });
  // Sets up tracer for tracing executions to APM. See x-pack/plugins/elastic_assistant/server/lib/langchain/tracers/README.mdx
  // If LangSmith env vars are set, executions will be traced there as well. See https://docs.smith.langchain.com/tracing
  const apmTracer = new APMTracer({ projectName: traceOptions?.projectName ?? 'default' }, logger);

  let traceData;

  // Wrap executor call with an APM span for instrumentation
  await withAssistantSpan(DEFAULT_AGENT_EXECUTOR_ID, async (span) => {
    if (span?.transaction?.ids['transaction.id'] != null && span?.ids['trace.id'] != null) {
      traceData = {
        // Transactions ID since this span is the parent
        transaction_id: span.transaction.ids['transaction.id'],
        trace_id: span.ids['trace.id'],
      };
      span.addLabels({ evaluationId: traceOptions?.evaluationId });
    }

    // casting because MessageContent can be a string or an array of objects, its a weird type
    const question = latestMessage.content as string;
    return chain.invoke(
      { question, chat_history: pastMessages },
      {
        callbacks: [apmTracer, ...(traceOptions?.tracers ?? [])],
        runName: DEFAULT_AGENT_EXECUTOR_ID,
        tags: traceOptions?.tags ?? [],
      }
    );
  });

  return {
    connector_id: connectorId,
    data: llm.getActionResultData(), // the response from the actions framework
    trace_data: traceData,
    status: 'ok',
  };
};
