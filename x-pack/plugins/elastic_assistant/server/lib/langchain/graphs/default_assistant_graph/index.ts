/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool } from '@langchain/core/tools';
import { RetrievalQAChain } from 'langchain/chains';
import { getDefaultArguments } from '@kbn/langchain/server';
import {
  createOpenAIFunctionsAgent,
  createStructuredChatAgent,
  createToolCallingAgent,
} from 'langchain/agents';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { getLlmClass } from '../../../../routes/utils';
import { EsAnonymizationFieldsSchema } from '../../../../ai_assistant_data_clients/anonymization_fields/types';
import { AssistantToolParams } from '../../../../types';
import { AgentExecutor } from '../../executors/types';
import { formatPrompt, formatPromptStructured, systemPrompts } from './prompts';
import { GraphInputs } from './types';
import { getDefaultAssistantGraph } from './graph';
import { invokeGraph, streamGraph } from './helpers';
import { transformESSearchToAnonymizationFields } from '../../../../ai_assistant_data_clients/anonymization_fields/helpers';

/**
 * Drop in replacement for the existing `callAgentExecutor` that uses LangGraph
 */
export const callAssistantGraph: AgentExecutor<true | false> = async ({
  abortSignal,
  actionsClient,
  alertsIndexPattern,
  assistantTools = [],
  bedrockChatEnabled,
  connectorId,
  conversationId,
  dataClients,
  esClient,
  esStore,
  langChainMessages,
  llmType,
  logger: parentLogger,
  isStream = false,
  onLlmResponse,
  onNewReplacements,
  replacements,
  request,
  size,
  systemPrompt,
  traceOptions,
  responseLanguage = 'English',
}) => {
  const logger = parentLogger.get('defaultAssistantGraph');
  const isOpenAI = llmType === 'openai';
  const llmClass = getLlmClass(llmType, bedrockChatEnabled);

  /**
   * Creates a new instance of llmClass.
   *
   * This function ensures that a new llmClass instance is created every time it is called.
   * This is necessary to avoid any potential side effects from shared state. By always
   * creating a new instance, we prevent other uses of llm from binding and changing
   * the state unintentionally. For this reason, never assign this value to a variable (ex const llm = createLlmInstance())
   */
  const createLlmInstance = () =>
    new llmClass({
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

  const latestMessage = langChainMessages.slice(-1); // the last message

  const modelExists = await esStore.isModelInstalled();

  // Create a chain that uses the ELSER backed ElasticsearchStore, override k=10 for esql query generation for now
  const chain = RetrievalQAChain.fromLLM(createLlmInstance(), esStore.asRetriever(10));

  // Check if KB is available
  const isEnabledKnowledgeBase = (await dataClients?.kbDataClient?.isModelDeployed()) ?? false;

  // Fetch any applicable tools that the source plugin may have registered
  const assistantToolParams: AssistantToolParams = {
    alertsIndexPattern,
    anonymizationFields,
    chain,
    esClient,
    isEnabledKnowledgeBase,
    kbDataClient: dataClients?.kbDataClient,
    logger,
    modelExists,
    onNewReplacements,
    replacements,
    request,
    size,
  };

  const tools: StructuredTool[] = assistantTools.flatMap(
    (tool) => tool.getTool({ ...assistantToolParams, llm: createLlmInstance() }) ?? []
  );

  // If KB enabled, fetch for any KB IndexEntries and generate a tool for each
  if (isEnabledKnowledgeBase && dataClients?.kbDataClient?.isV2KnowledgeBaseEnabled) {
    const kbTools = await dataClients?.kbDataClient?.getAssistantTools({
      assistantToolParams,
      esClient,
    });
    if (kbTools) {
      tools.push(...kbTools);
    }
  }

  const agentRunnable = isOpenAI
    ? await createOpenAIFunctionsAgent({
        llm: createLlmInstance(),
        tools,
        prompt: formatPrompt(systemPrompts.openai, systemPrompt),
        streamRunnable: isStream,
      })
    : llmType && ['bedrock', 'gemini'].includes(llmType) && bedrockChatEnabled
    ? await createToolCallingAgent({
        llm: createLlmInstance(),
        tools,
        prompt:
          llmType === 'bedrock'
            ? formatPrompt(systemPrompts.bedrock, systemPrompt)
            : formatPrompt(systemPrompts.gemini, systemPrompt),
        streamRunnable: isStream,
      })
    : await createStructuredChatAgent({
        llm: createLlmInstance(),
        tools,
        prompt: formatPromptStructured(systemPrompts.structuredChat, systemPrompt),
        streamRunnable: isStream,
      });

  const apmTracer = new APMTracer({ projectName: traceOptions?.projectName ?? 'default' }, logger);

  const assistantGraph = getDefaultAssistantGraph({
    agentRunnable,
    dataClients,
    // we need to pass it like this or streaming does not work for bedrock
    createLlmInstance,
    logger,
    tools,
    replacements,
  });
  const inputs: GraphInputs = {
    bedrockChatEnabled,
    responseLanguage,
    conversationId,
    llmType,
    isStream,
    input: latestMessage[0]?.content as string,
  };

  if (isStream) {
    return streamGraph({
      apmTracer,
      assistantGraph,
      inputs,
      logger,
      onLlmResponse,
      request,
      traceOptions,
    });
  }

  const graphResponse = await invokeGraph({
    apmTracer,
    assistantGraph,
    inputs,
    onLlmResponse,
    traceOptions,
  });

  return {
    body: {
      connector_id: connectorId,
      data: graphResponse.output,
      trace_data: graphResponse.traceData,
      replacements,
      status: 'ok',
      ...(graphResponse.conversationId ? { conversationId: graphResponse.conversationId } : {}),
    },
    headers: {
      'content-type': 'application/json',
    },
  };
};
