/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { EcsMappingState } from '../../types';
import { ECS_MAIN_PROMPT } from './prompts';
import type { EcsNodeParams } from './types';

export async function handleEcsMapping({
  state,
  model,
}: EcsNodeParams): Promise<Partial<EcsMappingState>> {
  const outputParser = new JsonOutputParser();
  const ecsMainGraph = ECS_MAIN_PROMPT.pipe(model).pipe(outputParser);

  const currentMapping = await ecsMainGraph.invoke({
    ecs: state.ecs,
    combined_samples: state.combinedSamples,
    package_name: state.packageName,
    data_stream_name: state.dataStreamName,
    ex_answer: state.exAnswer,
  });
  return { currentMapping, hasTriedOnce: true, lastExecutedChain: 'ecsMapping' };
}
