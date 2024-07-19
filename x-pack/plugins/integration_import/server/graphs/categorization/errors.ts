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
import { CATEGORIZATION_ERROR_PROMPT } from './prompts';

export async function handleErrors(
  state: CategorizationState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const categorizationErrorPrompt = CATEGORIZATION_ERROR_PROMPT;

  const outputParser = new JsonOutputParser();
  const categorizationErrorGraph = categorizationErrorPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await categorizationErrorGraph.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    ex_answer: state.exAnswer,
    errors: JSON.stringify(state.errors, null, 2),
    package_name: state.packageName,
    data_stream_name: state.dataStreamName,
  })) as ESProcessorItem[];

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, currentProcessors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: false,
    lastExecutedChain: 'error',
  };
}
