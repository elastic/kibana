/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockDependencies } from '../../__mocks__';

import { RequestHandlerContext } from '@kbn/core/server';

import { ErrorCode } from '../../../common/types/error_codes';

jest.mock('../../lib/indices/fetch_ml_inference_pipeline_processors', () => ({
  fetchMlInferencePipelineProcessors: jest.fn(),
}));
jest.mock('../../utils/create_ml_inference_pipeline', () => ({
  createAndReferenceMlInferencePipeline: jest.fn(),
}));
import { fetchMlInferencePipelineProcessors } from '../../lib/indices/fetch_ml_inference_pipeline_processors';
import { createAndReferenceMlInferencePipeline } from '../../utils/create_ml_inference_pipeline';

import { registerIndexRoutes } from './indices';

describe('Enterprise Search Managed Indices', () => {
  let mockRouter: MockRouter;
  const mockClient = {
    asCurrentUser: {},
  };

  describe('GET /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors', () => {
    beforeEach(() => {
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors',
      });

      registerIndexRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('fails validation without index_name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });

    it('returns a list of ml_inference processors for an index pipeline', async () => {
      const mockData = {
        processor1: {
          isDeployed: true,
          modelType: 'pytorch',
          pipelineName: 'processor-name',
          trainedModelName: 'trained-model',
        },
      };

      (fetchMlInferencePipelineProcessors as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockData);
      });

      await mockRouter.callRoute({
        params: { indexName: 'search-index-name' },
      });

      expect(fetchMlInferencePipelineProcessors).toHaveBeenCalledWith({}, 'search-index-name');

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockData,
        headers: { 'content-type': 'application/json' },
      });
    });
  });

  describe('POST /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors', () => {
    const mockRequestBody = {
      model_id: 'my-model-id',
      pipeline_name: 'my-pipeline-name',
      source_field: 'my-source-field',
      destination_field: 'my-dest-field',
    };

    beforeEach(() => {
      jest.clearAllMocks();

      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'post',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors',
      });

      registerIndexRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('fails validation without index_name', () => {
      const request = {
        params: {},
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without required body properties', () => {
      const request = {
        params: { indexName: 'my-index-name' },
        body: {},
      };
      mockRouter.shouldThrow(request);
    });

    it('creates an ML inference pipeline', async () => {
      (createAndReferenceMlInferencePipeline as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve({
          id: 'ml-inference-my-pipeline-name',
          created: true,
          addedToParentPipeline: true,
        });
      });

      await mockRouter.callRoute({
        params: { indexName: 'my-index-name' },
        body: mockRequestBody,
      });

      expect(createAndReferenceMlInferencePipeline).toHaveBeenCalledWith(
        'my-index-name',
        mockRequestBody.pipeline_name,
        mockRequestBody.model_id,
        mockRequestBody.source_field,
        mockRequestBody.destination_field,
        {}
      );

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          created: 'ml-inference-my-pipeline-name',
        },
        headers: { 'content-type': 'application/json' },
      });
    });

    it('responds with 409 CONFLICT if the pipeline already exists', async () => {
      (createAndReferenceMlInferencePipeline as jest.Mock).mockImplementationOnce(() => {
        return Promise.reject(new Error(ErrorCode.PIPELINE_ALREADY_EXISTS));
      });

      await mockRouter.callRoute({
        params: { indexName: 'my-index-name' },
        body: mockRequestBody,
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
        })
      );
    });
  });
});
