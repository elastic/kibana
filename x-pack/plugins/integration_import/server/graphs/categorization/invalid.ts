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
import type { CategorizationState } from '../../types';
import { combineProcessors } from '../../util/processors';
import { ECS_EVENT_TYPES_PER_CATEGORY } from './constants';
import { CATEGORIZATION_VALIDATION_PROMPT } from './prompts';

export async function handleInvalidCategorization(
  state: CategorizationState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const categorizationInvalidPrompt = CATEGORIZATION_VALIDATION_PROMPT;

  const outputParser = new JsonOutputParser();
  const categorizationInvalidGraph = categorizationInvalidPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await categorizationInvalidGraph.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    invalid_categorization: JSON.stringify(state.invalidCategorization, null, 2),
    ex_answer: state.exAnswer,
    compatible_types: JSON.stringify(ECS_EVENT_TYPES_PER_CATEGORY, null, 2),
  })) as ESProcessorItem[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: false,
    lastExecutedChain: 'invalidCategorization',
  };
}
