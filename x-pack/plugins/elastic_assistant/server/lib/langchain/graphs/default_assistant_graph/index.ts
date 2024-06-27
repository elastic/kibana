/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool } from '@langchain/core/tools';
import { RetrievalQAChain } from 'langchain/chains';
import {
  getDefaultArguments,
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server';
import { createOpenAIFunctionsAgent, createStructuredChatAgent } from 'langchain/agents';
import { EsAnonymizationFieldsSchema } from '../../../../ai_assistant_data_clients/anonymization_fields/types';
import { AssistantToolParams } from '../../../../types';
import { AgentExecutor } from '../../executors/types';
import { openAIFunctionAgentPrompt, structuredChatAgentPrompt } from './prompts';
import { APMTracer } from '../../tracers/apm_tracer';
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
  isEnabledKnowledgeBase,
  assistantTools = [],
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
  traceOptions,
  responseLanguage = 'English',
}) => {
  const logger = parentLogger.get('defaultAssistantGraph');
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

  const latestMessage = langChainMessages.slice(-1); // the last message

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
    kbDataClient: dataClients?.kbDataClient,
    llm,
    logger,
    modelExists,
    onNewReplacements,
    replacements,
    request,
    size,
  };

  const tools: StructuredTool[] = assistantTools.flatMap(
    (tool) => tool.getTool(assistantToolParams) ?? []
  );

  const agentRunnable = isOpenAI
    ? await createOpenAIFunctionsAgent({
        llm,
        tools,
        prompt: openAIFunctionAgentPrompt,
        streamRunnable: isStream,
      })
    : await createStructuredChatAgent({
        llm,
        tools,
        prompt: structuredChatAgentPrompt,
        streamRunnable: isStream,
      });

  const apmTracer = new APMTracer({ projectName: traceOptions?.projectName ?? 'default' }, logger);

  const assistantGraph = getDefaultAssistantGraph({
    agentRunnable,
    conversationId,
    dataClients,
    llm,
    logger,
    tools,
    responseLanguage,
    replacements,
  });
  const inputs = { input: latestMessage[0]?.content as string };

  if (isStream) {
    return streamGraph({ apmTracer, assistantGraph, inputs, logger, onLlmResponse, request });
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
    },
    headers: {
      'content-type': 'application/json',
    },
  };
};
