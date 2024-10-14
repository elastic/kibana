/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineResult } from './validate';
import { partialShuffleArray } from '../../../common';

/**
 * Selects a subset of results for further processing from the given list.
 *
 * Note that pipelineResults is modified in place (its elements are partially shuffled).
 * The shuffle is deterministic and reproducible, based on the default seed.
 *
 * @param pipelineResults - An array of PipelineResult objects to select from.
 * @param maxSamples - The maximum number of samples to select.
 * @returns An array of PipelineResult objects, containing up to `maxSamples` elements.
 */
export function selectResults(
  pipelineResults: PipelineResult[],
  maxSamples: number
): PipelineResult[] {
  const numSamples = Math.min(pipelineResults.length, maxSamples);
  partialShuffleArray(pipelineResults, numSamples);
  return pipelineResults.slice(0, numSamples);
}
