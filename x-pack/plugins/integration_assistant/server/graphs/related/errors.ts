/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import { GraphRecursionError } from '@langchain/langgraph';
import type { Pipeline } from '../../../common';
import type { RelatedState, SimplifiedProcessors, SimplifiedProcessor } from '../../types';
import type { RelatedNodeParams } from './types';
import { combineProcessors } from '../../util/processors';
import { RELATED_ERROR_PROMPT } from './prompts';
import { COMMON_ERRORS } from './constants';
import { RecursionLimitError } from '../../lib/errors';

export async function handleErrors({
  state,
  model,
}: RelatedNodeParams): Promise<Partial<RelatedState>> {
  const relatedErrorPrompt = RELATED_ERROR_PROMPT;
  const outputParser = new JsonOutputParser();
  const relatedErrorGraph = relatedErrorPrompt.pipe(model).pipe(outputParser);
  let currentProcessors: SimplifiedProcessor[] = [];
  try {
    currentProcessors = (await relatedErrorGraph.invoke({
      current_processors: JSON.stringify(state.currentProcessors, null, 2),
      common_errors: JSON.stringify(COMMON_ERRORS, null, 2),
      ex_answer: state.exAnswer,
      errors: JSON.stringify(state.errors, null, 2),
      package_name: state.packageName,
      data_stream_name: state.dataStreamName,
    })) as SimplifiedProcessor[];
  } catch (e) {
    if (e instanceof GraphRecursionError) {
      throw new RecursionLimitError(e.message);
    } else {
      throw e;
    }
  }

  const processors = {
    type: 'related',
    processors: currentProcessors,
  } as SimplifiedProcessors;

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, processors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: false,
    lastExecutedChain: 'error',
  };
}
