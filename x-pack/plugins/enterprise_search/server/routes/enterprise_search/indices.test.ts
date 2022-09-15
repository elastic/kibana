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
jest.mock('../../lib/indices/exists_index', () => ({
  indexOrAliasExists: jest.fn(),
}));

import { indexOrAliasExists } from '../../lib/indices/exists_index';
import { fetchMlInferencePipelineProcessors } from '../../lib/indices/fetch_ml_inference_pipeline_processors';

import { registerIndexRoutes } from './indices';

describe('Enterprise Search Managed Indices', () => {
  const mockClient = {
    asCurrentUser: {
      ingest: {
        putPipeline: jest.fn(),
        simulate: jest.fn(),
      },
    },
  };

  const mockCore = {
    elasticsearch: { client: mockClient },
  };

  describe('GET /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

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

      expect(fetchMlInferencePipelineProcessors).toHaveBeenCalledWith(
        mockClient.asCurrentUser,
        'search-index-name'
      );

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockData,
        headers: { 'content-type': 'application/json' },
      });
    });
  });

  describe('POST /internal/enterprise_search/indices/{indexName}/ml_inference/pipelines/_simulate', () => {
    let mockRouter: MockRouter;

    const pipelineBody = {
      description: 'Some pipeline',
      processors: [
        {
          set: {
            field: 'some_field',
            value: 'some value',
          },
        },
      ],
    };

    const docs = [
      {
        _index: 'some-index',
        _id: '1',
        _source: {
          my_field: 'my value',
        },
      },
    ];
    const indexName = 'my-index';

    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'post',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipelines/_simulate',
      });

      registerIndexRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('fails validation without index_name', () => {
      const request = {
        body: pipelineBody,
        docs,
        params: {},
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without pipeline body', () => {
      const request = {
        body: {},
        docs,
        params: { indexName },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without docs', () => {
      const request = {
        body: pipelineBody,
        docs: [],
        params: { indexName },
      };
      mockRouter.shouldThrow(request);
    });

    it('returns error if index does not exist', async () => {
      const request = {
        body: pipelineBody,
        docs,
        params: { indexName },
      };

      (indexOrAliasExists as jest.Mock).mockImplementationOnce(() => Promise.resolve(false));

      await mockRouter.callRoute(request);

      expect(indexOrAliasExists).toHaveBeenCalledWith(mockClient, indexName);
      expect(mockRouter.response.ok).toHaveBeenCalledTimes(0);
      expect(mockRouter.response.customError).toHaveBeenCalledTimes(1);
    });

    it('simulates pipeline', async () => {
      const request = {
        body: pipelineBody,
        docs,
        params: { indexName },
      };

      const simulateResponse = {
        simulateKey: 'simulate value',
      };

      (indexOrAliasExists as jest.Mock).mockImplementationOnce(() => Promise.resolve(true));
      mockClient.asCurrentUser.ingest.simulate.mockImplementationOnce(() =>
        Promise.resolve(simulateResponse)
      );

      await mockRouter.callRoute(request);

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: simulateResponse,
        headers: { 'content-type': 'application/json' },
      });
    });
  });

  describe('PUT /internal/enterprise_search/indices/{indexName}/ml_inference/pipelines/{pipelineName}', () => {
    let mockRouter: MockRouter;
    const pipelineName = 'some-pipeline';
    const indexName = 'some-index';
    const pipelineBody = {
      description: 'Some pipeline',
      processors: [
        {
          set: {
            field: 'some_field',
            value: 'some value',
          },
        },
      ],
    };

    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'put',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipelines/{pipelineName}',
      });

      registerIndexRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('fails validation without index name', () => {
      const request = {
        body: pipelineBody,
        params: { pipelineName },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without pipeline name', () => {
      const request = {
        body: pipelineBody,
        params: { indexName },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without pipeline body', () => {
      const request = {
        body: {},
        params: { indexName, pipelineName },
      };
      mockRouter.shouldThrow(request);
    });

    it('returns error if index does not exist', async () => {
      const request = {
        body: pipelineBody,
        params: { indexName, pipelineName },
      };

      (indexOrAliasExists as jest.Mock).mockImplementationOnce(() => Promise.resolve(false));

      await mockRouter.callRoute(request);

      expect(indexOrAliasExists).toHaveBeenCalledWith(mockClient, indexName);
      expect(mockRouter.response.ok).toHaveBeenCalledTimes(0);
      expect(mockRouter.response.customError).toHaveBeenCalledTimes(1);
    });

    it('creates pipeline', async () => {
      const request = {
        body: pipelineBody,
        params: { indexName, pipelineName },
      };

      const putResponse = {
        putKey: 'put value',
      };

      (indexOrAliasExists as jest.Mock).mockImplementationOnce(() => Promise.resolve(true));
      mockClient.asCurrentUser.ingest.putPipeline.mockImplementationOnce(() =>
        Promise.resolve(putResponse)
      );

      await mockRouter.callRoute(request);

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: putResponse,
        headers: { 'content-type': 'application/json' },
      });
    });
  });
});
