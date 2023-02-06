/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DeleteMlInferencePipelineResponse } from '../../../../../common/types/pipelines';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface DeleteMlInferencePipelineApiLogicArgs {
  indexName: string;
  pipelineName: string;
}

export type { DeleteMlInferencePipelineResponse };

export const deleteMlInferencePipeline = async (
  args: DeleteMlInferencePipelineApiLogicArgs
): Promise<DeleteMlInferencePipelineResponse> => {
  const route = `/internal/enterprise_search/indices/${args.indexName}/ml_inference/pipeline_processors/${args.pipelineName}`;

  return await HttpLogic.values.http.delete<DeleteMlInferencePipelineResponse>(route);
};

export const DeleteMlInferencePipelineApiLogic = createApiLogic(
  ['delete_ml_inference_pipeline_api_logic'],
  deleteMlInferencePipeline
);
