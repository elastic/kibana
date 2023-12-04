/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough, Readable } from 'stream';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { ActionsClientLlm } from '../llm/actions_client_llm';
import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { KNOWLEDGE_BASE_INDEX_PATTERN } from '../../../routes/knowledge_base/constants';
import type { AgentExecutorParams, AgentExecutorResponse } from '../executors/types';
import { callConversationalRetrievalChain } from '../conversational_retrieval_chain';
export const DEFAULT_AGENT_EXECUTOR_ID = 'Elastic AI Assistant Agent Executor';

/**
 * Use an implementation of a ConversationalRetrievalChain to generate
 * output based on retrieved documents.
 *
 */
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
  traceOptions,
}: AgentExecutorParams): AgentExecutorResponse => {
  try {
    const llm = new ActionsClientLlm({
      actions,
      connectorId,
      request,
      llmType,
      logger,
      streaming: true,
    });

    const pastMessages = langChainMessages.slice(0, -1); // all but the last message
    const latestMessage = langChainMessages.slice(-1)[0]; // the last message

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
    const chainWithOutputParser = chain.pipe(
      new HttpResponseOutputParser({ contentType: 'text/plain' })
    );

    // // Sets up tracer for tracing executions to APM. See x-pack/plugins/elastic_assistant/server/lib/langchain/tracers/README.mdx
    // // If LangSmith env vars are set, executions will be traced there as well. See https://docs.smith.langchain.com/tracing
    // const apmTracer = new APMTracer({ projectName: traceOptions?.projectName ?? 'default' }, logger);
    //
    // let traceData;
    //
    // // Wrap executor call with an APM span for instrumentation
    // await withAssistantSpan(DEFAULT_AGENT_EXECUTOR_ID, async (span) => {
    //   if (span?.transaction?.ids['transaction.id'] != null && span?.ids['trace.id'] != null) {
    //     traceData = {
    //       // Transactions ID since this span is the parent
    //       transaction_id: span.transaction.ids['transaction.id'],
    //       trace_id: span.ids['trace.id'],
    //     };
    //     span.addLabels({ evaluationId: traceOptions?.evaluationId });
    //   }
    //
    //   return executor.call(
    //     { input: latestMessage[0].content },
    //     {
    //       callbacks: [apmTracer, ...(traceOptions?.tracers ?? [])],
    //       runName: DEFAULT_AGENT_EXECUTOR_ID,
    //       tags: traceOptions?.tags ?? [],
    //     }
    //   );
    // });

    console.log('WE ARE HERE before stream call');
    if (typeof latestMessage.content !== 'string') {
      throw new Error('Multimodal messages not supported.');
    }
    const stream = await chainWithOutputParser.stream({
      question: latestMessage.content,
      chat_history: pastMessages,
    });

    async function* generate() {
      try {
        for await (const chunk of stream) {
          console.log('WE ARE HERE CHUNK', chunk);
          yield chunk;
        }
      } catch (e) {
        console.log('WE ARE HERE ERROR generate?????', e);
        throw e;
      }
    }
    const readable = Readable.from(generate());

    console.log('WE ARE HERE after Readable.from', stream);

    return readable.pipe(new PassThrough());
  } catch (err) {
    console.log('WE ARE HERE ERROR execute?????', err);
    throw err;
  }
};
