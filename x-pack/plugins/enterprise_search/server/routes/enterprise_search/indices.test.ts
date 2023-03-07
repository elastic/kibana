/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockDependencies } from '../../__mocks__';

import { RequestHandlerContext } from '@kbn/core/server';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { SharedServices } from '@kbn/ml-plugin/server/shared_services';

import { ErrorCode } from '../../../common/types/error_codes';

jest.mock('../../lib/indices/pipelines/ml_inference/get_ml_inference_pipeline_history', () => ({
  fetchMlInferencePipelineHistory: jest.fn(),
}));
jest.mock(
  '../../lib/indices/pipelines/ml_inference/pipeline_processors/get_ml_inference_pipeline_processors',
  () => ({
    fetchMlInferencePipelineProcessors: jest.fn(),
  })
);
jest.mock(
  '../../lib/indices/pipelines/ml_inference/pipeline_processors/create_ml_inference_pipeline',
  () => ({
    createAndReferenceMlInferencePipeline: jest.fn(),
  })
);
jest.mock(
  '../../lib/indices/pipelines/ml_inference/pipeline_processors/attach_ml_pipeline',
  () => ({
    attachMlInferencePipeline: jest.fn(),
  })
);
jest.mock(
  '../../lib/indices/pipelines/ml_inference/pipeline_processors/delete_ml_inference_pipeline',
  () => ({
    deleteMlInferencePipeline: jest.fn(),
  })
);
jest.mock(
  '../../lib/indices/pipelines/ml_inference/pipeline_processors/detach_ml_inference_pipeline',
  () => ({
    detachMlInferencePipeline: jest.fn(),
  })
);
jest.mock('../../lib/indices/exists_index', () => ({
  indexOrAliasExists: jest.fn(),
}));
jest.mock('../../lib/indices/pipelines/ml_inference/get_ml_inference_errors', () => ({
  getMlInferenceErrors: jest.fn(),
}));
jest.mock('../../lib/pipelines/ml_inference/get_ml_inference_pipelines', () => ({
  getMlInferencePipelines: jest.fn(),
}));

import { indexOrAliasExists } from '../../lib/indices/exists_index';
import { getMlInferenceErrors } from '../../lib/indices/pipelines/ml_inference/get_ml_inference_errors';
import { fetchMlInferencePipelineHistory } from '../../lib/indices/pipelines/ml_inference/get_ml_inference_pipeline_history';
import { attachMlInferencePipeline } from '../../lib/indices/pipelines/ml_inference/pipeline_processors/attach_ml_pipeline';
import { createAndReferenceMlInferencePipeline } from '../../lib/indices/pipelines/ml_inference/pipeline_processors/create_ml_inference_pipeline';
import { deleteMlInferencePipeline } from '../../lib/indices/pipelines/ml_inference/pipeline_processors/delete_ml_inference_pipeline';
import { detachMlInferencePipeline } from '../../lib/indices/pipelines/ml_inference/pipeline_processors/detach_ml_inference_pipeline';
import { fetchMlInferencePipelineProcessors } from '../../lib/indices/pipelines/ml_inference/pipeline_processors/get_ml_inference_pipeline_processors';
import { getMlInferencePipelines } from '../../lib/pipelines/ml_inference/get_ml_inference_pipelines';
import { ElasticsearchResponseError } from '../../utils/identify_exceptions';

import { registerIndexRoutes } from './indices';

describe('Enterprise Search Managed Indices', () => {
  let mockRouter: MockRouter;
  const mockClient = {
    asCurrentUser: {
      ingest: {
        getPipeline: jest.fn(),
        putPipeline: jest.fn(),
        simulate: jest.fn(),
      },
      search: jest.fn(),
    },
  };
  const mockCore = {
    elasticsearch: { client: mockClient },
    savedObjects: { client: {} },
  };
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /internal/enterprise_search/indices/{indexName}/ml_inference/errors', () => {
    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/errors',
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

    it('fetches ML inference errors', async () => {
      const errorsResult = [
        {
          message: 'Error message 1',
          doc_count: 100,
          timestamp: '2022-10-05T13:50:36.100Z',
        },
        {
          message: 'Error message 2',
          doc_count: 200,
          timestamp: '2022-10-05T13:50:36.200Z',
        },
      ];

      (getMlInferenceErrors as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(errorsResult);
      });

      await mockRouter.callRoute({
        params: { indexName: 'my-index-name' },
      });

      expect(getMlInferenceErrors).toHaveBeenCalledWith('my-index-name', mockClient.asCurrentUser);

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          errors: errorsResult,
        },
        headers: { 'content-type': 'application/json' },
      });
    });
  });

  describe('GET /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors', () => {
    let mockMl: SharedServices;
    let mockTrainedModelsProvider: MlTrainedModels;

    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors',
      });

      mockTrainedModelsProvider = {
        getTrainedModels: jest.fn(),
        getTrainedModelsStats: jest.fn(),
      } as MlTrainedModels;

      mockMl = {
        trainedModelsProvider: () => Promise.resolve(mockTrainedModelsProvider),
      } as unknown as jest.Mocked<SharedServices>;

      registerIndexRoutes({
        ...mockDependencies,
        router: mockRouter.router,
        ml: mockMl,
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
        mockTrainedModelsProvider,
        'search-index-name'
      );

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockData,
        headers: { 'content-type': 'application/json' },
      });
    });

    it('returns a generic error if an error is thrown from the called service', async () => {
      (fetchMlInferencePipelineProcessors as jest.Mock).mockImplementationOnce(() => {
        return Promise.reject(new Error('something went wrong'));
      });

      await mockRouter.callRoute({
        params: { indexName: 'search-index-name' },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledTimes(1);
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
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

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
        undefined,
        mockClient.asCurrentUser
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
        body: mockRequestBody,
        params: { indexName: 'my-index-name' },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
        })
      );
    });
  });

  describe('POST /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/attach', () => {
    const pipelineName = 'some-pipeline';
    const indexName = 'some-index';

    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'post',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/attach',
      });

      registerIndexRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('fails validation without pipeline name on body', () => {
      const request = {
        body: {},
        params: { indexName },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without index name', () => {
      const request = {
        body: {},
        params: { pipelineName },
      };
      mockRouter.shouldThrow(request);
    });

    it('attaches an ML inference pipeline', async () => {
      (attachMlInferencePipeline as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          addedToParentPipeline: true,
          created: false,
          id: 'ml-inference-my-pipeline-name',
        })
      );

      await mockRouter.callRoute({ body: { pipeline_name: pipelineName }, params: { indexName } });

      expect(mockRouter.response.ok).toHaveBeenLastCalledWith({
        body: {
          addedToParentPipeline: true,
          created: false,
          id: 'ml-inference-my-pipeline-name',
        },
        headers: {
          'content-type': 'application/json',
        },
      });
    });
  });

  describe('DELETE /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/{pipelineName}', () => {
    const indexName = 'my-index';
    const pipelineName = 'my-pipeline';

    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'delete',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/{pipelineName}',
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

      expect(deleteMlInferencePipeline).toHaveBeenCalledWith(
        indexName,
        pipelineName,
        mockClient.asCurrentUser
      );

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

      expect(deleteMlInferencePipeline).toHaveBeenCalledWith(
        indexName,
        pipelineName,
        mockClient.asCurrentUser
      );
      expect(mockRouter.response.customError).toHaveBeenCalledTimes(1);
    });

    it('raises error if the pipeline is in use', async () => {
      (deleteMlInferencePipeline as jest.Mock).mockImplementationOnce(() => {
        return Promise.reject({
          message: ErrorCode.PIPELINE_IS_IN_USE,
          pipelineName: 'my-other-index@ml-inference',
        });
      });

      await mockRouter.callRoute({
        params: { indexName, pipelineName },
      });

      expect(deleteMlInferencePipeline).toHaveBeenCalledWith(
        indexName,
        pipelineName,
        mockClient.asCurrentUser
      );
      expect(mockRouter.response.customError).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/simulate', () => {
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
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/simulate',
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

  describe('POST /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/simulate/{pipelineName}', () => {
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
    const pipelineName = 'my-pipeline';

    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'post',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/simulate/{pipelineName}',
      });

      registerIndexRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('fails validation without index_name', () => {
      const request = {
        docs,
        params: { pipelineName },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without pipelineName', () => {
      const request = {
        docs,
        params: { indexName },
      };
      mockRouter.shouldThrow(request);
    });

    it('fails validation without docs', () => {
      const request = {
        docs: [],
        params: { indexName, pipelineName },
      };
      mockRouter.shouldThrow(request);
    });

    it('returns error if index does not exist', async () => {
      const request = {
        docs,
        params: { indexName, pipelineName },
      };

      (indexOrAliasExists as jest.Mock).mockImplementationOnce(() => Promise.resolve(false));

      await mockRouter.callRoute(request);

      expect(indexOrAliasExists).toHaveBeenCalledWith(mockClient, indexName);
      expect(mockRouter.response.ok).toHaveBeenCalledTimes(0);
      expect(mockRouter.response.customError).toHaveBeenCalledTimes(1);
    });

    it('returns error if pipeline does not exist', async () => {
      const request = {
        docs,
        params: { indexName, pipelineName },
      };
      (indexOrAliasExists as jest.Mock).mockImplementationOnce(() => Promise.resolve(true));
      mockClient.asCurrentUser.ingest.getPipeline.mockResolvedValue({});

      await mockRouter.callRoute(request);

      expect(mockClient.asCurrentUser.ingest.getPipeline).toHaveBeenCalledTimes(1);
      expect(mockClient.asCurrentUser.ingest.getPipeline).toHaveBeenCalledWith({
        id: pipelineName,
      });
      expect(mockRouter.response.ok).toHaveBeenCalledTimes(0);
      expect(mockRouter.response.customError).toHaveBeenCalledTimes(1);
    });

    it('simulates pipeline', async () => {
      const request = {
        docs,
        params: { indexName, pipelineName },
      };

      const simulateResponse = {
        simulateKey: 'simulate value',
      };

      (indexOrAliasExists as jest.Mock).mockImplementationOnce(() => Promise.resolve(true));
      mockClient.asCurrentUser.ingest.getPipeline.mockResolvedValue({
        [pipelineName]: pipelineBody,
      });
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

  describe('PUT /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/{pipelineName}', () => {
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
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/{pipelineName}',
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

  describe('GET /internal/enterprise_search/indices/{indexName}/ml_inference/history', () => {
    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/history',
      });

      registerIndexRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('fails validation without indexName', () => {
      const request = {
        params: {},
      };

      mockRouter.shouldThrow(request);
    });

    it('fetches ML inference history', async () => {
      const historyResult = {
        history: [
          {
            pipeline: 'test-001',
            doc_count: 10,
          },
          {
            pipeline: 'test-002',
            doc_count: 13,
          },
        ],
      };

      (fetchMlInferencePipelineHistory as jest.Mock).mockResolvedValueOnce(historyResult);

      await mockRouter.callRoute({
        params: { indexName: 'unit-test-index' },
      });

      expect(fetchMlInferencePipelineHistory).toHaveBeenCalledWith(
        mockClient.asCurrentUser,
        'unit-test-index'
      );

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: historyResult,
        headers: { 'content-type': 'application/json' },
      });
    });

    it('fails if fetching history fails', async () => {
      (fetchMlInferencePipelineHistory as jest.Mock).mockRejectedValueOnce(new Error('Oh No!!!'));

      await mockRouter.callRoute({
        params: { indexName: 'unit-test-index' },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        body: {
          attributes: {
            error_code: 'uncaught_exception',
          },
          message: 'Enterprise Search encountered an error. Check Kibana Server logs for details.',
        },
        statusCode: 502,
      });
    });
  });

  describe('DELETE /internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/{pipelineName}/detach', () => {
    const indexName = 'my-index';
    const pipelineName = 'my-pipeline';

    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'delete',
        path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/{pipelineName}/detach',
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

    it('detaches pipeline', async () => {
      const mockResponse = { updated: `${indexName}@ml-inference` };

      (detachMlInferencePipeline as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockResponse);
      });

      await mockRouter.callRoute({
        params: { indexName, pipelineName },
      });

      expect(detachMlInferencePipeline).toHaveBeenCalledWith(
        indexName,
        pipelineName,
        mockClient.asCurrentUser
      );

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockResponse,
        headers: { 'content-type': 'application/json' },
      });
    });

    it('raises error if detaching failed', async () => {
      const errorReason = `pipeline is missing: [${pipelineName}]`;
      const mockError = new Error(errorReason) as ElasticsearchResponseError;
      mockError.meta = {
        body: {
          error: {
            type: 'resource_not_found_exception',
          },
        },
      };
      (detachMlInferencePipeline as jest.Mock).mockImplementationOnce(() => {
        return Promise.reject(mockError);
      });

      await mockRouter.callRoute({
        params: { indexName, pipelineName },
      });

      expect(detachMlInferencePipeline).toHaveBeenCalledWith(
        indexName,
        pipelineName,
        mockClient.asCurrentUser
      );
      expect(mockRouter.response.customError).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /internal/enterprise_search/pipelines/ml_inference', () => {
    let mockTrainedModelsProvider: MlTrainedModels;
    let mockMl: SharedServices;

    beforeEach(() => {
      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/pipelines/ml_inference',
      });

      mockTrainedModelsProvider = {
        getTrainedModels: jest.fn(),
        getTrainedModelsStats: jest.fn(),
      } as MlTrainedModels;

      mockMl = {
        trainedModelsProvider: () => Promise.resolve(mockTrainedModelsProvider),
      } as unknown as jest.Mocked<SharedServices>;

      registerIndexRoutes({
        ...mockDependencies,
        router: mockRouter.router,
        ml: mockMl,
      });
    });

    it('fetches ML inference pipelines', async () => {
      const pipelinesResult = {
        pipeline1: {
          processors: [],
        },
        pipeline2: {
          processors: [],
        },
        pipeline3: {
          processors: [],
        },
      };

      (getMlInferencePipelines as jest.Mock).mockResolvedValueOnce(pipelinesResult);

      await mockRouter.callRoute({});

      expect(getMlInferencePipelines).toHaveBeenCalledWith(
        mockClient.asCurrentUser,
        mockTrainedModelsProvider
      );

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: pipelinesResult,
        headers: { 'content-type': 'application/json' },
      });
    });
  });
});
