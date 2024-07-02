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
import {
  getDefaultArguments,
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server';
import { MessagesPlaceholder } from '@langchain/core/prompts';
import { EsAnonymizationFieldsSchema } from '../../../ai_assistant_data_clients/anonymization_fields/types';
import { transformESSearchToAnonymizationFields } from '../../../ai_assistant_data_clients/anonymization_fields/helpers';
import { AgentExecutor } from '../executors/types';
import { APMTracer } from '../tracers/apm_tracer';
import { AssistantToolParams } from '../../../types';
import { withAssistantSpan } from '../tracers/with_assistant_span';
export const DEFAULT_AGENT_EXECUTOR_ID = 'Elastic AI Assistant Agent Executor';

/**
 * The default agent executor used by the Elastic AI Assistant. Main agent/chain that wraps the ActionsClientSimpleChatModel,
 * sets up a conversation BufferMemory from chat history, and registers tools like the ESQLKnowledgeBaseTool.
 *
 */
export const callAgentExecutor: AgentExecutor<true | false> = async ({
  abortSignal,
  actionsClient,
  alertsIndexPattern,
  isEnabledKnowledgeBase,
  assistantTools = [],
  connectorId,
  esClient,
  esStore,
  langChainMessages,
  llmType,
  logger,
  isStream = false,
  onLlmResponse,
  onNewReplacements,
  replacements,
  request,
  size,
  traceOptions,
  dataClients,
}) => {
  const isOpenAI = llmType === 'openai';
  const llmClass = isOpenAI ? ActionsClientChatOpenAI : ActionsClientSimpleChatModel;

  const llm = new llmClass({
    actionsClient,
    connectorId,
    llmType,
    logger,
    // possible client model override,
    // let this be undefined otherwise so the connector handles the model
    model: request.body.model,
    // ensure this is defined because we default to it in the language_models
    // This is where the LangSmith logs (Metadata > Invocation Params) are set
    temperature: getDefaultArguments(llmType).temperature,
    signal: abortSignal,
    streaming: isStream,
    // prevents the agent from retrying on failure
    // failure could be due to bad connector, we should deliver that result to the client asap
    maxRetries: 0,
  });

  const anonymizationFieldsRes =
    await dataClients?.anonymizationFieldsDataClient?.findDocuments<EsAnonymizationFieldsSchema>({
      perPage: 1000,
      page: 1,
    });

  const anonymizationFields = anonymizationFieldsRes
    ? transformESSearchToAnonymizationFields(anonymizationFieldsRes.data)
    : undefined;

  const pastMessages = langChainMessages.slice(0, -1); // all but the last message
  const latestMessage = langChainMessages.slice(-1); // the last message

  const memory = new BufferMemory({
    chatHistory: new ChatMessageHistory(pastMessages),
    memoryKey: 'chat_history', // this is the key expected by https://github.com/langchain-ai/langchainjs/blob/a13a8969345b0f149c1ca4a120d63508b06c52a5/langchain/src/agents/initialize.ts#L166
    inputKey: 'input',
    outputKey: 'output',
    returnMessages: true,
  });

  const modelExists = await esStore.isModelInstalled();

  // Create a chain that uses the ELSER backed ElasticsearchStore, override k=10 for esql query generation for now
  const chain = RetrievalQAChain.fromLLM(llm, esStore.asRetriever(10));

  // Fetch any applicable tools that the source plugin may have registered
  const assistantToolParams: AssistantToolParams = {
    alertsIndexPattern,
    anonymizationFields,
    chain,
    esClient,
    isEnabledKnowledgeBase,
    llm,
    logger,
    modelExists,
    onNewReplacements,
    replacements,
    request,
    size,
  };

  const tools: ToolInterface[] = assistantTools.flatMap(
    (tool) => tool.getTool(assistantToolParams) ?? []
  );

  logger.debug(
    () => `applicable tools: ${JSON.stringify(tools.map((t) => t.name).join(', '), null, 2)}`
  );

  const executorArgs = {
    memory,
    verbose: false,
    handleParsingErrors: 'Try again, paying close attention to the allowed tool input',
  };
  // isOpenAI check is not on agentType alone because typescript doesn't like
  const executor = isOpenAI
    ? await initializeAgentExecutorWithOptions(tools, llm, {
        agentType: 'openai-functions',
        ...executorArgs,
      })
    : await initializeAgentExecutorWithOptions(tools, llm, {
        agentType: 'structured-chat-zero-shot-react-description',
        ...executorArgs,
        returnIntermediateSteps: false,
        agentArgs: {
          // this is important to help LangChain correctly format tool input
          humanMessageTemplate: `Remember, when you have enough information, always prefix your final JSON output with "Final Answer:"\n\nQuestion: {input}\n\n{agent_scratchpad}.`,
          memoryPrompts: [new MessagesPlaceholder('chat_history')],
          suffix:
            'Begin! Reminder to ALWAYS use the above format, and to use tools if appropriate.',
        },
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
        ).catch(() => {});
      }
      streamEnd();
      didEnd = true;
      if ((streamingSpan && !streamingSpan?.outcome) || streamingSpan?.outcome === 'unknown') {
        streamingSpan.outcome = 'success';
      }
      streamingSpan?.end();
    };

    let message = '';
    let tokenParentRunId = '';

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
              handleLLMNewToken(payload, _idx, _runId, parentRunId) {
                if (tokenParentRunId.length === 0 && !!parentRunId) {
                  // set the parent run id as the parentRunId of the first token
                  // this is used to ensure that all tokens in the stream are from the same run
                  // filtering out runs that are inside e.g. tool calls
                  tokenParentRunId = parentRunId;
                }
                if (payload.length && !didEnd && tokenParentRunId === parentRunId) {
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
