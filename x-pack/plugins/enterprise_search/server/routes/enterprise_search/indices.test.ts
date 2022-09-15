/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockDependencies } from '../../__mocks__';

import { RequestHandlerContext } from '@kbn/core/server';

jest.mock('../../lib/indices/fetch_ml_inference_pipeline_processors', () => ({
  fetchMlInferencePipelineProcessors: jest.fn(),
}));
jest.mock('../../lib/indices/delete_ml_inference_pipeline', () => ({
  deleteMlInferencePipeline: jest.fn(),
}));

import { deleteMlInferencePipeline } from '../../lib/indices/delete_ml_inference_pipeline';
import { fetchMlInferencePipelineProcessors } from '../../lib/indices/fetch_ml_inference_pipeline_processors';
import { ElasticsearchResponseError } from '../../utils/identify_exceptions';

import { registerIndexRoutes } from './indices';

describe('Enterprise Search Managed Indices', () => {
  const mockClient = {
    asCurrentUser: {},
  };

  describe('GET /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors', () => {
    let mockRouter: MockRouter;
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

  describe('DELETE /internal/enterprise_search/indices/{indexName}/ml_inference/pipelines/{pipelineName}', () => {
    let mockRouter: MockRouter;
    const indexName = 'my-index';
    const pipelineName = 'my-pipeline';

    beforeEach(() => {
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'delete',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipelines/{pipelineName}',
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

    it('deletes pipeline', async () => {
      const mockResponse = { deleted: pipelineName };

      (deleteMlInferencePipeline as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockResponse);
      });

      await mockRouter.callRoute({
        params: { indexName, pipelineName },
      });

      expect(deleteMlInferencePipeline).toHaveBeenCalledWith(indexName, pipelineName, {});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockResponse,
        headers: { 'content-type': 'application/json' },
      });
    });

    it('raises error if deletion failed', async () => {
      const errorReason = `pipeline is missing: [${pipelineName}]`;
      const mockError = new Error(errorReason) as ElasticsearchResponseError;
      mockError.meta = {
        body: {
          error: {
            type: 'resource_not_found_exception',
          },
        },
      };
      (deleteMlInferencePipeline as jest.Mock).mockImplementationOnce(() => {
        return Promise.reject(mockError);
      });

      await mockRouter.callRoute({
        params: { indexName, pipelineName },
      });

      expect(deleteMlInferencePipeline).toHaveBeenCalledWith(indexName, pipelineName, {});
      expect(mockRouter.response.customError).toHaveBeenCalledTimes(1);
    });
  });
});
