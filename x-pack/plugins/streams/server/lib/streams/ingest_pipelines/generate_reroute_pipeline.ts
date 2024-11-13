/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition } from '../../../../common/types';
import { ASSET_VERSION } from '../../../../common/constants';
import { conditionToPainless } from '../helpers/condition_to_painless';
import { getReroutePipelineName } from './name';

interface GenerateReroutePipelineParams {
  definition: StreamDefinition;
}

export async function generateReroutePipeline({ definition }: GenerateReroutePipelineParams) {
  return {
    id: getReroutePipelineName(definition.id),
    processors: definition.children.map((child) => {
      return {
        reroute: {
          destination: child.id,
          if: conditionToPainless(child.condition),
        },
      };
    }),
    _meta: {
      description: `Reoute pipeline for the ${definition.id} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}
