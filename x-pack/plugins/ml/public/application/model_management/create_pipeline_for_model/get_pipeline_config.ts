/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { InferecePipelineCreationState } from './state';

export function getPipelineConfig(
  state: InferecePipelineCreationState,
  pipelineConfig?: estypes.IngestPipeline
): estypes.IngestPipeline {
  const { ignoreFailure, modelId, onFailure, pipelineDescription, initialPipelineConfig } = state;
  const updatedPipelineConfig = { ...(initialPipelineConfig ?? {}), ...(pipelineConfig ?? {}) };
  const processor =
    updatedPipelineConfig?.processors && updatedPipelineConfig.processors?.length
      ? updatedPipelineConfig?.processors[0]
      : {};

  return {
    description: pipelineDescription,
    processors: [
      {
        inference: {
          model_id: modelId,
          ignore_failure: ignoreFailure,
          ...(processor.inference ? processor.inference : {}),
          ...(onFailure && Object.keys(onFailure).length > 0 ? { on_failure: onFailure } : {}),
        },
      },
    ],
  };
}
