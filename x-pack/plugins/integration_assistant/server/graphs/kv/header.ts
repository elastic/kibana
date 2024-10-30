/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { KVState } from '../../types';
import type { HandleKVNodeParams } from './types';
import { KV_HEADER_PROMPT } from './prompts';
import { KV_HEADER_EXAMPLE_ANSWER } from './constants';

export async function handleHeader({
  state,
  model,
  client,
}: HandleKVNodeParams): Promise<Partial<KVState>> {
  const outputParser = new JsonOutputParser();
  const kvHeaderGraph = KV_HEADER_PROMPT.pipe(model).pipe(outputParser);

  const pattern = await kvHeaderGraph.invoke({
    samples: state.logSamples,
    packageName: state.packageName,
    dataStreamName: state.dataStreamName,
    ex_answer: JSON.stringify(KV_HEADER_EXAMPLE_ANSWER, null, 2),
  });

  return {
    grokPattern: pattern.grok_pattern,
    lastExecutedChain: 'kvHeader',
  };
}
