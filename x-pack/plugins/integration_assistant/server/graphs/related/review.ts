/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { BedrockChat } from '@kbn/langchain/server/language_models';
import { RELATED_REVIEW_PROMPT } from './prompts';
import { RelatedState } from '../../types';
import { combineProcessors } from '../../util/processors';
import { Pipeline } from '../../../common';

export async function handleReview(state: RelatedState, model: BedrockChat) {
  const relatedReviewPrompt = RELATED_REVIEW_PROMPT;
  const outputParser = new JsonOutputParser();
  const relatedReviewGraph = relatedReviewPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await relatedReviewGraph.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    ex_answer: state.exAnswer,
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
  })) as any[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: true,
    lastExecutedChain: 'review',
  };
}
