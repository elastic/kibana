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
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should fetch the required knowledge base entry successfully', async () => {
    clusterClient.search.mockReturnValue(
      // @ts-expect-error not full response interface
      getKnowledgeBaseEntrySearchEsMock()
    );

    const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient(
      assistantKnowledgeBaseDataClientParams
    );
    const result = await assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries();

    expect(clusterClient.search).toHaveBeenCalledTimes(1);

    expect(result).toEqual([
      getKnowledgeBaseEntryMock(getCreateKnowledgeBaseEntrySchemaMock({ required: true })),
    ]);
  });
});
