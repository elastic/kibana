/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestSimulateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';

import { HttpLogic } from '../../../shared/http';

export interface SimulateExistingMlInterfacePipelineArgs {
  docs: string;
  indexName: string;
  pipelineName: string;
}
export type SimulateExistingMlInterfacePipelineResponse = IngestSimulateResponse;

export const simulateExistingMlInferencePipeline = async ({
  docs,
  indexName,
  pipelineName,
}: SimulateExistingMlInterfacePipelineArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/ml_inference/pipeline_processors/simulate/${pipelineName}`;

  return await HttpLogic.values.http.post<IngestSimulateResponse>(route, {
    body: JSON.stringify({
      docs,
    }),
  });
};

export const SimulateExistingMlInterfacePipelineApiLogic = createApiLogic(
  ['simulate_existing_ml_inference_pipeline_api_logic'],
  simulateExistingMlInferencePipeline
);
