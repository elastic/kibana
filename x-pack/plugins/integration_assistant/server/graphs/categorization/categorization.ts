/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { Pipeline } from '../../../common';
import type { CategorizationState, SimplifiedProcessor, SimplifiedProcessors } from '../../types';
import { combineProcessors } from '../../util/processors';
import { CATEGORIZATION_EXAMPLE_PROCESSORS } from './constants';
import { CATEGORIZATION_MAIN_PROMPT } from './prompts';
import type { CategorizationNodeParams } from './types';

export async function handleCategorization({
  state,
  model,
}: CategorizationNodeParams): Promise<Partial<CategorizationState>> {
  const categorizationMainPrompt = CATEGORIZATION_MAIN_PROMPT;
  const outputParser = new JsonOutputParser();
  const categorizationMainGraph = categorizationMainPrompt.pipe(model).pipe(outputParser);
  const currentProcessors = (await categorizationMainGraph.invoke({
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
    example_processors: CATEGORIZATION_EXAMPLE_PROCESSORS,
    ex_answer: state?.exAnswer,
    ecs_categories: state?.ecsCategories,
    ecs_types: state?.ecsTypes,
  })) as SimplifiedProcessor[];

  const processors = {
    type: 'categorization',
    processors: currentProcessors,
  } as SimplifiedProcessors;

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, processors);
  return {
    currentPipeline,
    currentProcessors,
    hasTriedOnce: true,
    lastExecutedChain: 'categorization',
  };
}
