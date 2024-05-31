/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EcsMappingState, CategorizationState, RelatedState } from '../types';
import { testPipeline } from './pipeline';
import { ESClient } from './es';

export async function handleValidatePipeline(
  state: EcsMappingState | CategorizationState | RelatedState
): Promise<Partial<CategorizationState> | Partial<RelatedState> | Partial<EcsMappingState>> {
  const client = ESClient.getClient();
  const results = await testPipeline(state.rawSamples, state.currentPipeline, client);
  return {
    errors: results.errors,
    pipelineResults: results.pipelineResults,
    lastExecutedChain: 'validate_pipeline',
  };
}
