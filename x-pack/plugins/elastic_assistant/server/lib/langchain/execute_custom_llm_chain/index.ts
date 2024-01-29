/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { RetrievalQAChain } from 'langchain/chains';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { Tool } from '@langchain/core/tools';

import { streamFactory } from '@kbn/ml-response-stream/server';
import { RunLogPatch } from '@langchain/core/dist/tracers/log_stream';
import { ElasticsearchStore } from '../elasticsearch_store/elasticsearch_store';
import { ActionsClientChatOpenAI } from '../llm/openai';
import { ActionsClientLlm } from '../llm/actions_client_llm';
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
  actions,
  alertsIndexPattern,
  allow,
  allowReplacement,
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
    streaming: isStream,
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
    allow,
    allowReplacement,
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
  const tools: Tool[] = assistantTools.flatMap((tool) => tool.getTool(assistantToolParams) ?? []);

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
    const logStream = executor.streamLog(
      {
        input: latestMessage[0].content,
        chat_history: [],
      }
      // TODO before merge to main
      // uncomment
      // {
      //   callbacks: [apmTracer, ...(traceOptions?.tracers ?? [])],
      //   runName: DEFAULT_AGENT_EXECUTOR_ID,
      //   tags: traceOptions?.tags ?? [],
      // }
    );

    const {
      end: streamEnd,
      push,
      responseWithHeaders,
    } = streamFactory<{ type: string; payload: string }>(request.headers, logger, false, false);

    // Do not call this using `await` so it will run asynchronously while we return the stream in responseWithHeaders
    readStream(logStream, push, streamEnd);
    console.log('returning responseWithHeaders', responseWithHeaders);
    // TODO before merge to main
    // figure out how to pass trace_data and replacements @spong @macri @yuliia
    return responseWithHeaders;
  }

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

    return executor.call(
      { input: latestMessage[0].content },
      {
        callbacks: [apmTracer, ...(traceOptions?.tracers ?? [])],
        runName: DEFAULT_AGENT_EXECUTOR_ID,
        tags: traceOptions?.tags ?? [],
      }
    );
  });

  return {
    body: {
      connector_id: connectorId,
      data: llm.getActionResultData(), // the response from the actions framework
      trace_data: traceData,
      replacements,
      status: 'ok',
    },
    headers: {
      'content-type': 'application/json',
    },
  };
};
async function readStream(
  logStream: AsyncGenerator<RunLogPatch>,
  push: (arg0: { type: string; payload: string }) => void,
  streamEnd: () => void
) {
  push({ type: 'starting', payload: 'hello world' });
  for await (const chunk of logStream) {
    if (chunk.ops?.length > 0 && chunk.ops[0].op === 'add') {
      const addOp = chunk.ops[0];
      if (
        addOp.path.startsWith('/logs/ActionsClientChatOpenAI') &&
        typeof addOp.value === 'string' &&
        addOp.value.length
      ) {
        push({ type: 'content', payload: addOp.value });
      }
    }
  }

  push({ type: 'after', payload: 'hello world' });
  streamEnd();
  push({ type: 'streamEnd', payload: 'hello world' });
}
