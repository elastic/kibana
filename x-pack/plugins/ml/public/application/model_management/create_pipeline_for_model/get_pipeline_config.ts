/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { InferecePipelineCreationState } from './state';

export function getPipelineConfig(state: InferecePipelineCreationState): estypes.IngestPipeline {
  const { ignoreFailure, modelId, onFailure, pipelineDescription, initialPipelineConfig } = state;
  const processor =
    initialPipelineConfig?.processors && initialPipelineConfig.processors?.length
      ? initialPipelineConfig?.processors[0]
      : {};

  // @ts-expect-error pipeline._meta is defined as mandatory
  return {
    description: pipelineDescription,
    processors: [
      {
        inference: {
          ...(processor?.inference
            ? {
                ...processor.inference,
                ignore_failure: ignoreFailure,
                ...(onFailure && Object.keys(onFailure).length > 0
                  ? { on_failure: onFailure }
                  : { on_failure: undefined }),
              }
            : {}),
          model_id: modelId,
        },
      },
    ],
  };
}
