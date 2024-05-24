/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { deepCopy } from './util';

interface Pipeline {
  processors: any[];
}

export function combineProcessors(initialPipeline: Pipeline, processors: any[]): Pipeline {
  // Create a deep copy of the initialPipeline to avoid modifying the original input
  const currentPipeline = deepCopy(initialPipeline);

  // Access and modify the processors list in the copied pipeline
  const currentProcessors = currentPipeline.processors;
  const combinedProcessors = [
    ...currentProcessors.slice(0, -1),
    ...processors,
    ...currentProcessors.slice(-1),
  ];
  currentPipeline.processors = combinedProcessors;

  return currentPipeline;
}
