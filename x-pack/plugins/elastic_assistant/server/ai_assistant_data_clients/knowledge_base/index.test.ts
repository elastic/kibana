/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import { AIAssistantKnowledgeBaseDataClient, KnowledgeBaseDataClientParams } from '.';
import { AuthenticatedUser } from '@kbn/core-security-common';
import {
  getCreateKnowledgeBaseEntrySchemaMock,
  getKnowledgeBaseEntryMock,
  getKnowledgeBaseEntrySearchEsMock,
} from '../../__mocks__/knowledge_base_entry_schema.mock';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { mlPluginMock } from '@kbn/ml-plugin/public/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import pRetry from 'p-retry';

import { loadSecurityLabs } from '../../lib/langchain/content_loaders/security_labs_loader';
jest.mock('../../lib/langchain/content_loaders/security_labs_loader');
jest.mock('p-retry');
const date = '2023-03-28T22:27:28.159Z';
let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;
const esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;

const mockLogger = loggerMock.create();
const mockUser1 = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

const mockedPRetry = pRetry as jest.MockedFunction<typeof pRetry>;
mockedPRetry.mockResolvedValue({});

describe('AIAssistantKnowledgeBaseDataClient', () => {
  let mockOptions: KnowledgeBaseDataClientParams;
  let ml: MlPluginSetup;
  let savedObjectClient: ReturnType<typeof savedObjectsRepositoryMock.create>;
  const getElserId = jest.fn();
  const trainedModelsProvider = jest.fn();
  const installElasticModel = jest.fn();
  const mockLoadSecurityLabs = loadSecurityLabs as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    savedObjectClient = savedObjectsRepositoryMock.create();
    mockLoadSecurityLabs.mockClear();
    ml = mlPluginMock.createSetupContract() as unknown as MlPluginSetup; // Missing SharedServices mock, so manually mocking trainedModelsProvider
    ml.trainedModelsProvider = trainedModelsProvider.mockImplementation(() => ({
      getELSER: jest.fn().mockImplementation(() => '.elser_model_2'),
      installElasticModel: installElasticModel.mockResolvedValue({}),
    }));
    mockOptions = {
      logger,
      elasticsearchClientPromise: Promise.resolve(esClientMock),
      spaceId: 'default',
      indexPatternsResourceName: '',
      currentUser: mockUser1,
      kibanaVersion: '8.8.0',
      ml,
      getElserId: getElserId.mockResolvedValue('elser-id'),
      getIsKBSetupInProgress: jest.fn().mockReturnValue(false),
      ingestPipelineResourceName: 'something',
      setIsKBSetupInProgress: jest.fn().mockImplementation(() => {}),
      v2KnowledgeBaseEnabled: true,
      manageGlobalKnowledgeBaseAIAssistant: true,
    };
    esClientMock.search.mockReturnValue(
      // @ts-expect-error not full response interface
      getKnowledgeBaseEntrySearchEsMock()
    );
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  describe('isSetupAvailable', () => {
    it('should return true if ML capabilities check succeeds', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      // @ts-expect-error not full response interface
      esClientMock.ml.getMemoryStats.mockResolvedValue({});
      const result = await client.isSetupAvailable();
      expect(result).toBe(true);
      expect(esClientMock.ml.getMemoryStats).toHaveBeenCalled();
    });

    it('should return false if ML capabilities check fails', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getMemoryStats.mockRejectedValue(new Error('Mocked Error'));
      const result = await client.isSetupAvailable();
      expect(result).toBe(false);
    });
  });

  describe('isModelInstalled', () => {
    it('should check if ELSER model is installed and return true if fully_defined', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModels.mockResolvedValue({
        count: 1,
        trained_model_configs: [
          { fully_defined: true, model_id: '', tags: [], input: { field_names: ['content'] } },
        ],
      });
      const result = await client.isModelInstalled();
      expect(result).toBe(true);
      expect(esClientMock.ml.getTrainedModels).toHaveBeenCalledWith({
        model_id: 'elser-id',
        include: 'definition_status',
      });
    });

    it('should return false if model is not fully defined', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModels.mockResolvedValue({
        count: 0,
        trained_model_configs: [
          { fully_defined: false, model_id: '', tags: [], input: { field_names: ['content'] } },
        ],
      });
      const result = await client.isModelInstalled();
      expect(result).toBe(false);
    });

    it('should return false and log error if getting model details fails', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModels.mockRejectedValue(new Error('error happened'));
      const result = await client.isModelInstalled();
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('isModelDeployed', () => {
    it('should check if ELSER model is deployed and return true if allocated', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModelsStats.mockResolvedValue({
        trained_model_stats: [
          {
            deployment_stats: {
              state: 'started',
              // @ts-expect-error not full response interface
              allocation_status: {
                state: 'fully_allocated',
              },
            },
          },
        ],
      });
      const result = await client.isModelDeployed();
      expect(result).toBe(true);
      expect(esClientMock.ml.getTrainedModelsStats).toHaveBeenCalledWith({ model_id: 'elser-id' });
    });

    it('should return true for serverless deployment', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModelsStats.mockResolvedValue({
        trained_model_stats: [
          {
            deployment_stats: {
              // @ts-expect-error not full response interface
              nodes: [{ routing_state: { routing_state: 'started' } }],
            },
          },
        ],
      });
      const result = await client.isModelDeployed();
      expect(result).toBe(true);
    });

    it('should return false if model is not deployed', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModelsStats.mockResolvedValue({
        // @ts-expect-error not full response interface
        trained_model_stats: [{ deployment_stats: { state: 'stopped' } }],
      });
      const result = await client.isModelDeployed();
      expect(result).toBe(false);
    });

    it('should return false if model is not found', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModelsStats.mockRejectedValue(new Error('Model not found'));
      const result = await client.isModelDeployed();
      expect(result).toBe(false);
    });
  });

  describe('setupKnowledgeBase', () => {
    it('should install, deploy, and load docs if not already done', async () => {
      // @ts-expect-error not full response interface
      esClientMock.search.mockResolvedValue({});
      esClientMock.ml.getTrainedModels.mockResolvedValue({
        count: 0,
        trained_model_configs: [
          { fully_defined: false, model_id: '', tags: [], input: { field_names: ['content'] } },
        ],
      });
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      await client.setupKnowledgeBase({ soClient: savedObjectClient });

      // install model
      expect(trainedModelsProvider).toHaveBeenCalledWith({}, savedObjectClient);
      expect(installElasticModel).toHaveBeenCalledWith('elser-id');
      expect(esClientMock.ml.startTrainedModelDeployment).toHaveBeenCalledWith({
        model_id: 'elser-id',
        wait_for: 'fully_allocated',
      });
      expect(loadSecurityLabs).toHaveBeenCalled();
    });

    it('should skip installation and deployment if model is already installed and deployed', async () => {
      esClientMock.ml.getTrainedModels.mockResolvedValue({
        count: 1,
        trained_model_configs: [
          { fully_defined: true, model_id: '', tags: [], input: { field_names: ['content'] } },
        ],
      });
      esClientMock.ml.getTrainedModelsStats.mockResolvedValue({
        trained_model_stats: [
          {
            deployment_stats: {
              state: 'started',
              // @ts-expect-error not full response interface
              allocation_status: {
                state: 'fully_allocated',
              },
            },
          },
        ],
      });
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);

      await client.setupKnowledgeBase({ soClient: savedObjectClient });

      expect(installElasticModel).not.toHaveBeenCalled();
      expect(esClientMock.ml.startTrainedModelDeployment).not.toHaveBeenCalled();
      expect(loadSecurityLabs).not.toHaveBeenCalled();
    });

    it('should handle errors during installation and deployment', async () => {
      // @ts-expect-error not full response interface
      esClientMock.search.mockResolvedValue({});
      esClientMock.ml.getTrainedModels.mockResolvedValue({
        count: 0,
        trained_model_configs: [
          { fully_defined: false, model_id: '', tags: [], input: { field_names: ['content'] } },
        ],
      });
      mockLoadSecurityLabs.mockRejectedValue(new Error('Installation error'));
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);

      await expect(client.setupKnowledgeBase({ soClient: savedObjectClient })).rejects.toThrow(
        'Error setting up Knowledge Base: Installation error'
      );
      expect(mockOptions.logger.error).toHaveBeenCalledWith(
        'Error setting up Knowledge Base: Installation error'
      );
    });
  });

  describe('getRequiredKnowledgeBaseDocumentEntries', () => {
    it('should throw is user is not found', async () => {
      const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient({
        ...mockOptions,
        currentUser: null,
      });
      await expect(
        assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries()
      ).rejects.toThrowError(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    });
    it('should fetch the required knowledge base entry successfully', async () => {
      const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      const result =
        await assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries();

      expect(esClientMock.search).toHaveBeenCalledTimes(1);

      expect(result).toEqual([
        getKnowledgeBaseEntryMock(getCreateKnowledgeBaseEntrySchemaMock({ required: true })),
      ]);
    });
    it('should return empty array if unexpected response from findDocuments', async () => {
      // @ts-expect-error not full response interface
      esClientMock.search.mockResolvedValue({});

      const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      const result =
        await assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries();

      expect(esClientMock.search).toHaveBeenCalledTimes(1);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });
});
