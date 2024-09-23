/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { GraphRecursionError } from '@langchain/langgraph';
import type { KVState } from '../../types';
import { KV_MAIN_PROMPT } from './prompts';
import { KVProcessor } from '../../processor_types';
import { HandleKVNodeParams } from './types';
import { KV_EXAMPLE_ANSWER } from './constants';
import { createKVProcessor } from '../../util/processors';
import { RecursionLimitError } from '../../lib/errors';

/**
 * Handles the KV processor node in the graph
 * @param state
 * @param model
 * @param client
 * @returns Partial<KVState>
 */
export async function handleKV({
  state,
  model,
  client,
}: HandleKVNodeParams): Promise<Partial<KVState>> {
  const kvMainGraph = KV_MAIN_PROMPT.pipe(model).pipe(new JsonOutputParser());

  // Pick logSamples if there was no header detected.
  const samples = state.header ? state.kvLogMessages : state.logSamples;
  let kvInput: KVProcessor;

  try {
    kvInput = (await kvMainGraph.invoke({
      samples: samples[0],
      ex_answer: JSON.stringify(KV_EXAMPLE_ANSWER, null, 2),
    })) as KVProcessor;
  } catch (e) {
    if (e instanceof GraphRecursionError) {
      throw new RecursionLimitError(e.message);
    } else {
      throw e;
    }
  }

  const kvProcessor = createKVProcessor(kvInput, state);

  return {
    kvProcessor,
    lastExecutedChain: 'handleKV',
  };
}
