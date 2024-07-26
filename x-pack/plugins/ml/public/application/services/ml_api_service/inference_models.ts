/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ModelConfig } from '@kbn/inference_integration_flyout/types';
import type { HttpService } from '../http_service';
import { ML_INTERNAL_BASE_PATH } from '../../../../common/constants/app';
export function inferenceModelsApiProvider(httpService: HttpService) {
  return {
    /**
     * creates inference endpoint id
     * @param inferenceId - Inference Endpoint Id
     * @param taskType - Inference Task type. Either sparse_embedding or text_embedding
     * @param modelConfig - Model configuration based on service type
     */
    async createInferenceEndpoint(
      inferenceId: string,
      taskType: InferenceTaskType,
      modelConfig: ModelConfig
    ) {
      const result = await httpService.http<estypes.InferencePutModelResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/_inference/${taskType}/${inferenceId}`,
        method: 'PUT',
        body: JSON.stringify(modelConfig),
        version: '1',
      });
      return result;
    },
    /**
     * Gets all inference endpoints
     */
    async getAllInferenceEndpoints() {
      const result = await httpService.http<{
        endpoints: estypes.InferenceModelConfigContainer[];
      }>({
        path: `${ML_INTERNAL_BASE_PATH}/_inference/all`,
        method: 'GET',
        version: '1',
      });
      return result;
    },
  };
}
