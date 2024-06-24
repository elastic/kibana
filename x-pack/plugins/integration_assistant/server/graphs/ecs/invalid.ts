/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantToolLlm } from '@kbn/elastic-assistant-plugin/server/types';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { EcsMappingState } from '../../types';
import { ECS_INVALID_PROMPT } from './prompts';

export async function handleInvalidEcs(state: EcsMappingState, model: AssistantToolLlm) {
  const ecsInvalidEcsPrompt = ECS_INVALID_PROMPT;
  const outputParser = new JsonOutputParser();
  const ecsInvalidEcsGraph = ecsInvalidEcsPrompt.pipe(model).pipe(outputParser);

  const currentMapping = await ecsInvalidEcsGraph.invoke({
    ecs: state.ecs,
    current_mapping: JSON.stringify(state.currentMapping, null, 2),
    ex_answer: state.exAnswer,
    formatted_samples: state.formattedSamples,
    invalid_ecs_fields: state.invalidEcsFields,
  });

  return { currentMapping, lastExecutedChain: 'invalidEcs' };
}
