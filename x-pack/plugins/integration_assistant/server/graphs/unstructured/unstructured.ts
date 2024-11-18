/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { UnstructuredLogState } from '../../types';
import { GROK_MAIN_PROMPT } from './prompts';
import { GrokResult, HandleUnstructuredNodeParams } from './types';
import { GROK_EXAMPLE_ANSWER } from './constants';

export async function handleUnstructured({
  state,
  model,
  client,
}: HandleUnstructuredNodeParams): Promise<Partial<UnstructuredLogState>> {
  const grokMainGraph = GROK_MAIN_PROMPT.pipe(model).pipe(new JsonOutputParser());

  // Pick logSamples if there was no header detected.
  const samples = state.logSamples;

  const pattern = (await grokMainGraph.invoke({
    packageName: state.packageName,
    dataStreamName: state.dataStreamName,
    samples: samples[0],
    ex_answer: JSON.stringify(GROK_EXAMPLE_ANSWER, null, 2),
  })) as GrokResult;

  return {
    grokPatterns: pattern.grok_patterns,
    lastExecutedChain: 'handleUnstructured',
  };
}
