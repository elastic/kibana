/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { BedrockChat } from '@kbn/langchain/server/language_models';
import { CATEGORIZATION_REVIEW_PROMPT } from './prompts';

import { CategorizationState } from '../../types';
import { combineProcessors } from '../../util/processors';
import { ECS_EVENT_TYPES_PER_CATEGORY } from './constants';
import { Pipeline } from '../../../common';

export async function handleReview(state: CategorizationState, model: BedrockChat) {
  const categorizationReviewPrompt = CATEGORIZATION_REVIEW_PROMPT;
  const outputParser = new JsonOutputParser();
  const categorizationReview = categorizationReviewPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await categorizationReview.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
    ex_answer: state?.exAnswer,
    package_name: state?.packageName,
    compatibility_matrix: JSON.stringify(ECS_EVENT_TYPES_PER_CATEGORY, null, 2),
  })) as any[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: true,
    lastExecutedChain: 'review',
  };
}
