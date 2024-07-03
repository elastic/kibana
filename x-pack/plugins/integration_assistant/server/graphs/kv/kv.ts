/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KVState } from '../../types';
import { KV_MAIN_PROMPT } from './prompts';
import { testPipeline } from '../../util/pipeline';
import { LogFormat } from '../../constants';
import { KVProcessor } from '../../processor_types';

export async function handleSamples(
  state: KVState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel,
  client: IScopedClusterClient
) {}

export async function handleKV(
  state: KVState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel,
  client: IScopedClusterClient
) {
  const kvMainPrompt = KV_MAIN_PROMPT;
  const outputParser = new JsonOutputParser();
  const kvMainGraph = kvMainPrompt.pipe(model).pipe(outputParser);

  const samples = state?.rawSamples;

  const kvProcessor = (await kvMainGraph.invoke({
    samples,
    package_name: state?.packageName,
    data_stream_name: state?.dataStreamName,
    ex_answer: state?.exAnswer,
  })) as KVProcessor;

  const { pipelineResults: kvOutputSamples, errors } = await create_json_input(
    kvProcessor,
    samples,
    client
  );

  if (errors.length > 0) {
    return { errors, lastExecutedChain: 'handleKV' };
  }

  const additionalProcessors = state.additionalProcessors;
  additionalProcessors.push(kvProcessor);

  return {
    additionalProcessors,
    rawSamples: samples,
    modifiedSamples: kvOutputSamples,
    logFormat: LogFormat.STRUCTURED_LOG,
    lastExecutedChain: 'handleKV',
  };
}

/**
 * Processes the log samples using the KV processor to generate the JSON representation of the input log to pass on to the ECS mapping graph
 * @param kvProcessor
 * @param formattedSamples
 * @param client
 * @returns pipelineResults, errors
 */
async function create_json_input(
  kvProcessor: KVProcessor,
  formattedSamples: string[],
  client: IScopedClusterClient
): Promise<{ pipelineResults: object[]; errors: object[] }> {
  const fieldName = kvProcessor?.kv?.field;
  // This processor removes the original message field in the JSON output
  const removeProcessor = { remove: { field: fieldName, ignore_missing: true } };
  const pipeline = { processors: [kvProcessor, removeProcessor] };
  const { pipelineResults, errors } = await testPipeline(formattedSamples, pipeline, client);
  return { pipelineResults, errors };
}
