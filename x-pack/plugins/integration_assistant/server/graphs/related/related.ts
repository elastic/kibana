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
import { RELATED_MAIN_PROMPT } from './prompts';

export async function handleRelated(
  state: RelatedState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const relatedMainPrompt = RELATED_MAIN_PROMPT;
  const outputParser = new JsonOutputParser();
  const relatedMainGraph = relatedMainPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await relatedMainGraph.invoke({
    pipeline_results: JSON.stringify(state.pipelineResults, null, 2),
    ex_answer: state.exAnswer,
    ecs: state.ecs,
  })) as ESProcessorItem[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: false,
    lastExecutedChain: 'related',
  };
}
