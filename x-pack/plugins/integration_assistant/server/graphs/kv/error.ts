/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { KVState } from '../../types';
import type { HandleKVNodeParams } from './types';
import { KV_ERROR_PROMPT, KV_HEADER_ERROR_PROMPT } from './prompts';
import { COMMON_ERRORS, KV_EXAMPLE_ANSWER, KV_HEADER_ERROR_EXAMPLE_ANSWER } from './constants';
import { createKVProcessor } from '../../util/processors';
import { KVProcessor } from '../../processor_types';

export async function handleKVError({
  state,
  model,
}: HandleKVNodeParams): Promise<Partial<KVState>> {
  const outputParser = new JsonOutputParser();
  const kvErrorGraph = KV_ERROR_PROMPT.pipe(model).pipe(outputParser);
  const proc = state.kvProcessor;
  const processor = proc[0].kv;

  const kvInput = (await kvErrorGraph.invoke({
    current_processor: JSON.stringify(processor, null, 2),
    errors: JSON.stringify(state.errors, null, 2),
    common_errors: JSON.stringify(COMMON_ERRORS, null, 2),
    ex_answer: JSON.stringify(KV_EXAMPLE_ANSWER, null, 2),
  })) as KVProcessor;

  const kvProcessor = createKVProcessor(kvInput, state);

  return {
    kvProcessor,
    lastExecutedChain: 'kvError',
  };
}

export async function handleHeaderError({
  state,
  model,
}: HandleKVNodeParams): Promise<Partial<KVState>> {
  const outputParser = new JsonOutputParser();
  const kvHeaderErrorGraph = KV_HEADER_ERROR_PROMPT.pipe(model).pipe(outputParser);
  const currentPattern = state.grokPattern;

  const pattern = await kvHeaderErrorGraph.invoke({
    packageName: state.packageName,
    dataStreamName: state.dataStreamName,
    current_pattern: JSON.stringify(currentPattern, null, 2),
    errors: JSON.stringify(state.errors, null, 2),
    ex_answer: JSON.stringify(KV_HEADER_ERROR_EXAMPLE_ANSWER, null, 2),
  });

  return {
    grokPattern: pattern.grok_pattern,
    lastExecutedChain: 'kv_header_error',
  };
}
