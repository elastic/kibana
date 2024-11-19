/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition } from '../../../../common/types';
import { ASSET_VERSION } from '../../../../common/constants';
import { conditionToPainless } from '../helpers/condition_to_painless';
import { logsDefaultPipelineProcessors } from './logs_default_pipeline';
import { isRoot } from '../helpers/hierarchy';
import { getProcessingPipelineName } from './name';

export function generateIngestPipeline(id: string, definition: StreamDefinition) {
  return {
    id: getProcessingPipelineName(id),
    processors: [
      ...(isRoot(definition.id) ? logsDefaultPipelineProcessors : []),
      ...definition.processing.map((processor) => {
        const { type, ...config } = processor.config;
        return {
          [type]: {
            ...config,
            if: processor.condition ? conditionToPainless(processor.condition) : undefined,
          },
        };
      }),
      {
        pipeline: {
          name: `${id}@stream.reroutes`,
          ignore_missing_pipeline: true,
        },
      },
    ],
    _meta: {
      description: `Default pipeline for the ${id} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}
