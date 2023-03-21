/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import {
  detachMlInferencePipeline,
  DetachMlInferencePipelineResponse,
} from './detach_ml_inference_pipeline';

describe('DetachMlInferencePipelineApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detachMlInferencePipeline', () => {
    it('calls detach ml inference api', async () => {
      const response: Promise<DetachMlInferencePipelineResponse> = Promise.resolve({
        updated: 'parent-pipeline-name',
      });
      http.delete.mockReturnValue(response);
      const result = await detachMlInferencePipeline({
        indexName: 'mock-index-name',
        pipelineName: 'mock-pipeline-name',
      });

      expect(http.delete).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/mock-index-name/ml_inference/pipeline_processors/mock-pipeline-name/detach'
      );

      expect(result).toEqual({
        updated: 'parent-pipeline-name',
      });
    });
  });
});
