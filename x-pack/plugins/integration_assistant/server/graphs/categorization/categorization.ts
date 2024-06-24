/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantToolLlm } from '@kbn/elastic-assistant-plugin/server/types';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { ESProcessorItem, Pipeline } from '../../../common';
import type { CategorizationState } from '../../types';
import { combineProcessors } from '../../util/processors';
import { CATEGORIZATION_MAIN_PROMPT } from './prompts';

export async function handleCategorization(state: CategorizationState, model: AssistantToolLlm) {
  const categorizationMainPrompt = CATEGORIZATION_MAIN_PROMPT;
  const outputParser = new JsonOutputParser();
  const categorizationMainGraph = categorizationMainPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await categorizationMainGraph.invoke({
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
    ex_answer: state?.exAnswer,
    ecs_categories: state?.ecsCategories,
    ecs_types: state?.ecsTypes,
  })) as ESProcessorItem[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    lastExecutedChain: 'categorization',
  };
}
