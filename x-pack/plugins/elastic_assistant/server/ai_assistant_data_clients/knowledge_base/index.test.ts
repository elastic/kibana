/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { AIAssistantKnowledgeBaseDataClient, KnowledgeBaseDataClientParams } from '.';
import { AuthenticatedUser } from '@kbn/core-security-common';
import {
  getCreateKnowledgeBaseEntrySchemaMock,
  getKnowledgeBaseEntryMock,
  getKnowledgeBaseEntrySearchEsMock,
} from '../../__mocks__/knowledge_base_entry_schema.mock';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { mlPluginMock } from '@kbn/ml-plugin/public/mocks';

const date = '2023-03-28T22:27:28.159Z';
let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const mockUser1 = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;

describe('AIAssistantKnowledgeBaseDataClient', () => {
  let assistantKnowledgeBaseDataClientParams: KnowledgeBaseDataClientParams;
  let ml: MlPluginSetup;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    ml = mlPluginMock.createSetupContract() as unknown as MlPluginSetup; // Missing SharedServices mock, so manually mocking trainedModelsProvider
    ml.trainedModelsProvider = jest.fn().mockImplementation(() => ({
      getELSER: jest.fn().mockImplementation(() => '.elser_model_2'),
    }));
    assistantKnowledgeBaseDataClientParams = {
      logger,
      elasticsearchClientPromise: Promise.resolve(clusterClient),
      spaceId: 'default',
      indexPatternsResourceName: '',
      currentUser: mockUser1,
      kibanaVersion: '8.8.0',
      ml,
      getElserId: jest.fn(),
      getIsKBSetupInProgress: jest.fn(),
      ingestPipelineResourceName: 'something',
      setIsKBSetupInProgress: jest.fn(),
      v2KnowledgeBaseEnabled: true,
      manageGlobalKnowledgeBaseAIAssistant: true,
    };
    clusterClient.search.mockReturnValue(
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
      const client = new AIAssistantKnowledgeBaseDataClient(assistantKnowledgeBaseDataClientParams);
      // @ts-expect-error not full response interface
      clusterClient.ml.getMemoryStats.mockResolvedValue({});
      const result = await client.isSetupAvailable();
      expect(result).toBe(true);
      expect(clusterClient.ml.getMemoryStats).toHaveBeenCalled();
    });

    it('should return false if ML capabilities check fails', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(assistantKnowledgeBaseDataClientParams);
      clusterClient.ml.getMemoryStats.mockRejectedValue(new Error('Mocked Error'));
      const result = await client.isSetupAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getRequiredKnowledgeBaseDocumentEntries', () => {
    it('should throw is user is not found', async () => {
      const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient({
        ...assistantKnowledgeBaseDataClientParams,
        currentUser: null,
      });
      await expect(
        assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries()
      ).rejects.toThrowError(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    });
    it('should fetch the required knowledge base entry successfully', async () => {
      const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient(
        assistantKnowledgeBaseDataClientParams
      );
      const result =
        await assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries();

      expect(clusterClient.search).toHaveBeenCalledTimes(1);

      expect(result).toEqual([
        getKnowledgeBaseEntryMock(getCreateKnowledgeBaseEntrySchemaMock({ required: true })),
      ]);
    });
    it('should return empty array if unexpected response from findDocuments', async () => {
      // @ts-expect-error not full response interface
      clusterClient.search.mockResolvedValue({});

      const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient(
        assistantKnowledgeBaseDataClientParams
      );
      const result =
        await assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries();

      expect(clusterClient.search).toHaveBeenCalledTimes(1);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });
});
