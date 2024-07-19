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
import type { ESProcessorItem, Pipeline } from '../../../common';
import type { RelatedState } from '../../types';
import { combineProcessors } from '../../util/processors';
import { RELATED_REVIEW_PROMPT } from './prompts';

export async function handleReview(
  state: RelatedState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const relatedReviewPrompt = RELATED_REVIEW_PROMPT;
  const outputParser = new JsonOutputParser();
  const relatedReviewGraph = relatedReviewPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await relatedReviewGraph.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    ex_answer: state.exAnswer,
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
  })) as ESProcessorItem[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: true,
    lastExecutedChain: 'review',
  };
}
