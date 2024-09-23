/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { GraphRecursionError } from '@langchain/langgraph';
import type { EcsMappingState } from '../../types';
import { ECS_INVALID_PROMPT } from './prompts';
import type { EcsNodeParams } from './types';
import { RecursionLimitError } from '../../lib/errors';

export async function handleInvalidEcs({
  state,
  model,
}: EcsNodeParams): Promise<Partial<EcsMappingState>> {
  const outputParser = new JsonOutputParser();
  const ecsInvalidEcsGraph = ECS_INVALID_PROMPT.pipe(model).pipe(outputParser);
  const usesFinalMapping = state?.useFinalMapping;
  const mapping = usesFinalMapping ? state.finalMapping : state.currentMapping;

  let result;
  try {
    result = await ecsInvalidEcsGraph.invoke({
      ecs: state.ecs,
      current_mapping: JSON.stringify(mapping, null, 2),
      ex_answer: state.exAnswer,
      combined_samples: state.combinedSamples,
      invalid_ecs_fields: state.invalidEcsFields,
    });
  } catch (e) {
    if (e instanceof GraphRecursionError) {
      throw new RecursionLimitError(e.message);
    } else {
      throw e;
    }
  }

  return {
    [usesFinalMapping ? 'finalMapping' : 'currentMapping']: result,
    lastExecutedChain: 'invalidEcs',
  };
}
