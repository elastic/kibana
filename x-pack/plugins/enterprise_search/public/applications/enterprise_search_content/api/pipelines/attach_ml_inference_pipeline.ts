/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachMlInferencePipelineResponse } from '../../../../../common/types/pipelines';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface AttachMlInferencePipelineApiLogicArgs {
  indexName: string;
  pipelineName: string;
}

export type { AttachMlInferencePipelineResponse };

export const attachMlInferencePipeline = async (
  args: AttachMlInferencePipelineApiLogicArgs
): Promise<AttachMlInferencePipelineResponse> => {
  const route = `/internal/enterprise_search/indices/${args.indexName}/ml_inference/pipeline_processors/attach`;
  const params = {
    pipeline_name: args.pipelineName,
  };

  return await HttpLogic.values.http.post<AttachMlInferencePipelineResponse>(route, {
    body: JSON.stringify(params),
  });
};

export const AttachMlInferencePipelineApiLogic = createApiLogic(
  ['attach_ml_inference_pipeline_api_logic'],
  attachMlInferencePipeline
);
