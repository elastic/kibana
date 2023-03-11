/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockHttpValues } from '../../../__mocks__/kea_logic';

import {
  createMlInferencePipeline,
  CreateMlInferencePipelineApiLogicArgs,
  CreateMlInferencePipelineResponse,
} from './create_ml_inference_pipeline';

describe('CreateMlInferencePipelineApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createMlInferencePipeline', () => {
    it('calls the api', async () => {
      const response: Promise<CreateMlInferencePipelineResponse> = Promise.resolve({
        created: 'ml-inference-unit-test',
      });
      http.post.mockReturnValue(response);

      const args: CreateMlInferencePipelineApiLogicArgs = {
        indexName: 'unit-test-index',
        modelId: 'test-model',
        pipelineName: 'unit-test',
        sourceField: 'body',
      };
      const result = await createMlInferencePipeline(args);
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/unit-test-index/ml_inference/pipeline_processors',
        {
          body: '{"model_id":"test-model","pipeline_name":"unit-test","source_field":"body"}',
        }
      );
      expect(result).toEqual({
        created: 'ml-inference-unit-test',
      });
    });
  });
});
