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
import { ECS_MISSING_KEYS_PROMPT } from './prompts';

export async function handleMissingKeys(
  state: EcsMappingState,
  model: ActionsClientChatOpenAI | ActionsClientSimpleChatModel
) {
  const outputParser = new JsonOutputParser();
  const ecsMissingGraph = ECS_MISSING_KEYS_PROMPT.pipe(model).pipe(outputParser);

  const currentMapping = await ecsMissingGraph.invoke({
    ecs: state.ecs,
    current_mapping: JSON.stringify(state.currentMapping, null, 2),
    ex_answer: state.exAnswer,
    combined_samples: state.combinedSamples,
    missing_keys: state?.missingKeys,
  });

  return { currentMapping, lastExecutedChain: 'missingKeys' };
}
