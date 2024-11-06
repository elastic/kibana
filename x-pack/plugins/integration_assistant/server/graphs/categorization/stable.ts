/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategorizationState } from '../../types';
import type { CategorizationBaseNodeParams } from './types';
import { diffCategorization } from './util';

/**
 * Updates the stable samples in the categorization state.
 *
 * Example: If the pipeline results are [A, B, C, D], the previous pipeline results are [A, X, C, D],
 * the previously stable samples are {0, 1} and the last reviewed samples are {1, 2}, then 1 will be removed from
 * the list of stable samples and 2 will be added to the list of stable samples. The new set will be {0, 2}.
 *
 * @param {CategorizationBaseNodeParams} params - The parameters containing the current state.
 * @returns {Partial<CategorizationState>} - The updated categorization state with new stable samples,
 *                                           cleared last reviewed samples, and the last executed chain set to 'handleUpdateStableSamples'.
 */
export function handleUpdateStableSamples({
  state,
}: CategorizationBaseNodeParams): Partial<CategorizationState> {
  if (state.previousPipelineResults.length === 0) {
    return {};
  }

  const diff = diffCategorization(state.pipelineResults, state.previousPipelineResults);

  const newStableSamples = Array.from(
    new Set<number>(
      [...state.stableSamples, ...state.lastReviewedSamples].filter((x) => !diff.has(x))
    )
  );

  return {
    stableSamples: newStableSamples,
    lastReviewedSamples: [],
    lastExecutedChain: 'handleUpdateStableSamples',
  };
}
