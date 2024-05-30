/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { BedrockChat } from '@kbn/langchain/server/language_models';
import { RELATED_ERROR_PROMPT } from './prompts';
import { RelatedState } from '../../types';
import { combineProcessors } from '../../util/pipeline';
import { Pipeline } from '../../../common';

export async function handleErrors(state: RelatedState, model: BedrockChat) {
  const relatedErrorPrompt = RELATED_ERROR_PROMPT;
  const outputParser = new JsonOutputParser();
  const relatedErrorGraph = relatedErrorPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await relatedErrorGraph.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    ex_answer: state.exAnswer,
    errors: JSON.stringify(state.errors, null, 2),
    package_name: state.packageName,
    data_stream_name: state.dataStreamName,
  })) as any[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: false,
    lastExecutedChain: 'error',
  };
}
