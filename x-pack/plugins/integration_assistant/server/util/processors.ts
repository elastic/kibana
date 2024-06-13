/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESProcessorItem, Pipeline } from '../../common';
import { deepCopy } from './util';

export function combineProcessors(
  initialPipeline: Pipeline,
  processors: ESProcessorItem[]
): Pipeline {
  // Create a deep copy of the initialPipeline to avoid modifying the original input
  const currentPipeline = deepCopy(initialPipeline);

  // Add the new processors right before the last 2 removeprocessor in the initial pipeline.
  // This is so all the processors if conditions are not accessing possibly removed fields.
  const currentProcessors = currentPipeline.processors;
  const combinedProcessors = [
    ...currentProcessors.slice(0, -2),
    ...processors,
    ...currentProcessors.slice(-2),
  ];
  currentPipeline.processors = combinedProcessors;
  return currentPipeline;
}
