/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KVState } from '../../types';
import { KV_MAIN_PROMPT } from './prompts';
import { testPipeline } from '../../util/pipeline';
import { KVProcessor } from '../../processor_types';
import { HandleKVNodeParams } from './types';
import { KV_EXAMPLE_ANSWER } from './constants';
import { createKVProcessor } from '../../util/processors';
import { ESProcessorItem } from '@kbn/integration-assistant-plugin/common';

export async function handleKV({state, model , client} : HandleKVNodeParams): Promise<Partial<KVState>> {
  const kvMainPrompt = KV_MAIN_PROMPT;
  const outputParser = new JsonOutputParser();
  const kvMainGraph = kvMainPrompt.pipe(model).pipe(outputParser);

  const samples = state.kvLogMessages;

  const kvInput = (await kvMainGraph.invoke({
    samples: samples[0],
    ex_answer: JSON.stringify(KV_EXAMPLE_ANSWER, null, 2),
  })) as KVProcessor;

  const kvProcessor = createKVProcessor(kvInput);
  console.log("**************");
  console.log(kvProcessor);

  const { pipelineResults: kvOutputSamples, errors } = await create_json_input(
    kvProcessor,
    samples,
    client
  );

  console.log(kvOutputSamples);

  // Converts JSON Object into a string and parses it as a array of JSON strings
  const jsonSamples = kvOutputSamples.map((log) => JSON.stringify(log));

  console.log(jsonSamples);

  const additionalProcessors = state.additionalProcessors;
  additionalProcessors.push(kvProcessor);

  return {
    additionalProcessors,
    jsonSamples: jsonSamples,
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
  kvProcessor: ESProcessorItem,
  formattedSamples: string[],
  client: IScopedClusterClient
): Promise<{ pipelineResults: object[]; errors: object[] }> {
  const fieldName = kvProcessor?.kv?.field;
  // This processor removes the original message field in the JSON output
  const removeProcessor = { remove: { field: 'message', ignore_missing: true } };
  const pipeline = { processors: [kvProcessor[0], removeProcessor] };
  const { pipelineResults, errors } = await testPipeline(formattedSamples, pipeline, client);
  return { pipelineResults, errors };
}
