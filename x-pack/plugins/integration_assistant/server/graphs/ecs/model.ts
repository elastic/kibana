/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { prefixSamples } from '../../util/samples';
import { ECS_EXAMPLE_ANSWER, ECS_FIELDS } from './constants';
import { createPipeline } from './pipeline';
import { mergeAndChunkSamples } from './chunk';
import type { EcsMappingState } from '../../types';

export function modelSubOutput(state: EcsMappingState): Partial<EcsMappingState> {
  return {
    lastExecutedChain: 'ModelSubOutput',
    finalMapping: state.currentMapping,
  };
}

export function modelInput(state: EcsMappingState): Partial<EcsMappingState> {
  const prefixedSamples = prefixSamples(state);
  const sampleChunks = mergeAndChunkSamples(prefixedSamples, state.chunkSize);
  return {
    exAnswer: JSON.stringify(ECS_EXAMPLE_ANSWER, null, 2),
    ecs: JSON.stringify(ECS_FIELDS, null, 2),
    prefixedSamples,
    sampleChunks,
    finalized: false,
    lastExecutedChain: 'modelInput',
  };
}

export function modelOutput(state: EcsMappingState): Partial<EcsMappingState> {
  const currentPipeline = createPipeline(state);
  return {
    finalized: true,
    lastExecutedChain: 'modelOutput',
    results: {
      mapping: state.finalMapping,
      pipeline: currentPipeline,
    },
  };
}
