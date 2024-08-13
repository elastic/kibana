/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { modifySamples } from '../../util/samples';
import { ECS_EXAMPLE_ANSWER, ECS_FIELDS } from './constants';
import { createPipeline } from './pipeline';
import { chunkSamples } from './chunk';
import type { EcsMappingState } from '../../types';

export function modelSubOutput(state: EcsMappingState): Partial<EcsMappingState> {
  return {
    lastExecutedChain: 'ModelSubOutput',
    finalMapping: state.currentMapping,
  };
}

export function modelInput(state: EcsMappingState): Partial<EcsMappingState> {
  const samples = modifySamples(state);
  const sampleChunks = chunkSamples(samples);
  return {
    exAnswer: JSON.stringify(ECS_EXAMPLE_ANSWER, null, 2),
    ecs: JSON.stringify(ECS_FIELDS, null, 2),
    samples,
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
