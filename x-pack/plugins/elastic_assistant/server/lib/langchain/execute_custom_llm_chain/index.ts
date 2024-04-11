/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import agent, { Span } from 'elastic-apm-node';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';

import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { ToolInterface } from '@langchain/core/tools';
import { streamFactory } from '@kbn/ml-response-stream/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RetrievalQAChain } from 'langchain/chains';
import { ActionsClientChatOpenAI, ActionsClientLlm } from '@kbn/elastic-assistant-common/impl/llm';
import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { KNOWLEDGE_BASE_INDEX_PATTERN } from '../../../routes/knowledge_base/constants';
import { AgentExecutor } from '../executors/types';
import { withAssistantSpan } from '../tracers/with_assistant_span';
import { APMTracer } from '../tracers/apm_tracer';
import { AssistantToolParams } from '../../../types';
export const DEFAULT_AGENT_EXECUTOR_ID = 'Elastic AI Assistant Agent Executor';

/**
 * The default agent executor used by the Elastic AI Assistant. Main agent/chain that wraps the ActionsClientLlm,
 * sets up a conversation BufferMemory from chat history, and registers tools like the ESQLKnowledgeBaseTool.
 *
 */
export const callAgentExecutor: AgentExecutor<true | false> = async ({
  abortSignal,
  actions,
  alertsIndexPattern,
  anonymizationFields,
  isEnabledKnowledgeBase,
  assistantTools = [],
  connectorId,
  elserId,
  esClient,
  kbResource,
  langChainMessages,
  llmType,
  logger,
  isStream = false,
  onLlmResponse,
  onNewReplacements,
  replacements,
  request,
  size,
  telemetry,
  traceOptions,
}) => {
  // TODO implement llmClass for bedrock streaming
  // tracked here: https://github.com/elastic/security-team/issues/7363
  const llmClass = isStream ? ActionsClientChatOpenAI : ActionsClientLlm;

  const llm = new llmClass({
    actions,
    connectorId,
    request,
    llmType,
    logger,
    model: request.body.model,
    signal: abortSignal,
    streaming: isStream,
    // prevents the agent from retrying on failure
    // failure could be due to bad connector, we should deliver that result to the client asap
    maxRetries: 0,
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

  // Create a chain that uses the ELSER backed ElasticsearchStore, override k=10 for esql query generation for now
  const chain = RetrievalQAChain.fromLLM(llm, esStore.asRetriever(10));

  // Fetch any applicable tools that the source plugin may have registered
  const assistantToolParams: AssistantToolParams = {
    anonymizationFields,
    alertsIndexPattern,
    isEnabledKnowledgeBase,
    chain,
    esClient,
    modelExists,
    onNewReplacements,
    replacements,
    request,
    size,
  };
  const tools: ToolInterface[] = assistantTools.flatMap(
    (tool) => tool.getTool(assistantToolParams) ?? []
  );

  logger.debug(`applicable tools: ${JSON.stringify(tools.map((t) => t.name).join(', '), null, 2)}`);

  // isStream check is not on agentType alone because typescript doesn't like
  const executor = isStream
    ? await initializeAgentExecutorWithOptions(tools, llm, {
        agentType: 'openai-functions',
        memory,
        verbose: false,
      })
    : await initializeAgentExecutorWithOptions(tools, llm, {
        agentType: 'chat-conversational-react-description',
        memory,
        verbose: false,
      });

  // Sets up tracer for tracing executions to APM. See x-pack/plugins/elastic_assistant/server/lib/langchain/tracers/README.mdx
  // If LangSmith env vars are set, executions will be traced there as well. See https://docs.smith.langchain.com/tracing
  const apmTracer = new APMTracer({ projectName: traceOptions?.projectName ?? 'default' }, logger);

  let traceData;
  if (isStream) {
    let streamingSpan: Span | undefined;
    if (agent.isStarted()) {
      streamingSpan = agent.startSpan(`${DEFAULT_AGENT_EXECUTOR_ID} (Streaming)`) ?? undefined;
    }
    const {
      end: streamEnd,
      push,
      responseWithHeaders,
    } = streamFactory<{ type: string; payload: string }>(request.headers, logger, false, false);

    let didEnd = false;

    const handleStreamEnd = (finalResponse: string, isError = false) => {
      if (onLlmResponse) {
        onLlmResponse(
          finalResponse,
          {
            transactionId: streamingSpan?.transaction?.ids?.['transaction.id'],
            traceId: streamingSpan?.ids?.['trace.id'],
          },
          isError
        );
      }
      streamEnd();
      didEnd = true;
      if ((streamingSpan && !streamingSpan?.outcome) || streamingSpan?.outcome === 'unknown') {
        streamingSpan.outcome = 'success';
      }
      streamingSpan?.end();
    };

    let message = '';

    executor
      .invoke(
        {
          input: latestMessage[0].content,
          chat_history: [],
          signal: abortSignal,
        },
        {
          callbacks: [
            {
              handleLLMNewToken(payload) {
                if (payload.length && !didEnd) {
                  push({ payload, type: 'content' });
                  // store message in case of error
                  message += payload;
                }
              },
              handleChainEnd(outputs, runId, parentRunId) {
                // if parentRunId is undefined, this is the end of the stream
                if (!parentRunId) {
                  handleStreamEnd(outputs.output);
                }
              },
            },
            apmTracer,
            ...(traceOptions?.tracers ?? []),
          ],
          runName: DEFAULT_AGENT_EXECUTOR_ID,
          tags: traceOptions?.tags ?? [],
        }
      )
      .catch((err) => {
        // if I throw an error here, it crashes the server. Not sure how to get around that.
        // If I put await on this function the error works properly, but when there is not an error
        // it waits for the entire stream to complete before resolving
        const error = transformError(err);

        if (error.message === 'AbortError') {
          // user aborted the stream, we must end it manually here
          return handleStreamEnd(message);
        }
        logger.error(`Error streaming from LangChain: ${error.message}`);
        push({ payload: error.message, type: 'content' });
        handleStreamEnd(error.message, true);
      });

    return responseWithHeaders;
  }

  // Wrap executor call with an APM span for instrumentation
  const langChainResponse = await withAssistantSpan(DEFAULT_AGENT_EXECUTOR_ID, async (span) => {
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
        runName: DEFAULT_AGENT_EXECUTOR_ID,
        tags: traceOptions?.tags ?? [],
      }
    );
  });

  const langChainOutput = langChainResponse.output;
  if (onLlmResponse) {
    await onLlmResponse(langChainOutput, traceData);
  }
  return {
    body: {
      connector_id: connectorId,
      data: langChainOutput, // the response from the actions framework
      trace_data: traceData,
      replacements,
      status: 'ok',
    },
    headers: {
      'content-type': 'application/json',
    },
  };
};
