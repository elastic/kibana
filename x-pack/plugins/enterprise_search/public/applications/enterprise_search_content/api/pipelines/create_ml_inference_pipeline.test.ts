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
        created: 'ml-inference-my-pipeline',
      });
      http.post.mockReturnValue(response);

      const args: CreateMlInferencePipelineApiLogicArgs = {
        fieldMappings: [
          {
            sourceField: 'my_source_field',
            targetField: 'my_target_field',
          },
        ],
        indexName: 'my-index',
        modelId: 'my-model-id',
        pipelineName: 'my-pipeline',
        // @ts-expect-error pipeline._meta defined as mandatory
        pipelineDefinition: { processors: [], version: 1 },
      };
      const result = await createMlInferencePipeline(args);
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/my-index/ml_inference/pipeline_processors',
        {
          body: '{"field_mappings":[{"sourceField":"my_source_field","targetField":"my_target_field"}],"model_id":"my-model-id","pipeline_definition":{"processors":[],"version":1},"pipeline_name":"my-pipeline"}',
        }
      );
      expect(result).toEqual({
        created: 'ml-inference-my-pipeline',
      });
    });
  });
});
