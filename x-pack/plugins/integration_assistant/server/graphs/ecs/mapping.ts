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
import type { EcsMappingState } from '../../types';
import { ECS_MAIN_PROMPT } from './prompts';

export async function handleEcsMapping(
  state: EcsMappingState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const ecsMainPrompt = ECS_MAIN_PROMPT;
  const outputParser = new JsonOutputParser();
  const ecsMainGraph = ecsMainPrompt.pipe(model).pipe(outputParser);

  const currentMapping = await ecsMainGraph.invoke({
    ecs: state.ecs,
    formatted_samples: state.formattedSamples,
    package_name: state.packageName,
    data_stream_name: state.dataStreamName,
    ex_answer: state.exAnswer,
  });

  return { currentMapping, lastExecutedChain: 'ecsMapping' };
}
