/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestSimulateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { MlInferencePipeline } from '../../../../../common/types/pipelines';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';

import { HttpLogic } from '../../../shared/http';

export interface SimulateMlInterfacePipelineArgs {
  docs: string;
  indexName: string;
  pipeline: MlInferencePipeline;
}
export type SimulateMlInterfacePipelineResponse = IngestSimulateResponse;

export const simulateMlInferencePipeline = async ({
  docs,
  indexName,
  pipeline,
}: SimulateMlInterfacePipelineArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/ml_inference/pipeline_processors/simulate`;

  return await HttpLogic.values.http.post<IngestSimulateResponse>(route, {
    body: JSON.stringify({
      docs,
      pipeline: {
        description: pipeline.description,
        processors: pipeline.processors,
      },
    }),
  });
};

export const SimulateMlInterfacePipelineApiLogic = createApiLogic(
  ['simulate_ml_inference_pipeline_api_logic'],
  simulateMlInferencePipeline
);
