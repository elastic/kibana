/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { ReplaySubject, Subject } from 'rxjs';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { conversationsDataClientMock } from '../__mocks__/data_clients.mock';
import { authenticatedUser } from '../__mocks__/user';
import { AIAssistantConversationsDataClient } from '../ai_assistant_data_clients/conversations';
import { AIAssistantService, AIAssistantServiceOpts } from '.';
import { retryUntil } from './create_resource_installation_helper.test';
import { mlPluginMock } from '@kbn/ml-plugin/public/mocks';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

jest.mock('../ai_assistant_data_clients/conversations', () => ({
  AIAssistantConversationsDataClient: jest.fn(),
}));

const licensing = Promise.resolve(
  licensingMock.createRequestHandlerContext({
    license: { type: 'enterprise' },
  })
);
let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const SimulateTemplateResponse = {
  template: {
    aliases: {
      alias_name_1: {
        is_hidden: true,
      },
      alias_name_2: {
        is_hidden: true,
      },
    },
    mappings: { enabled: false },
    settings: {},
  },
};

const GetAliasResponse = {
  '.kibana-elastic-ai-assistant-conversations-default-000001': {
    aliases: {
      alias_1: {
        is_hidden: true,
      },
      alias_2: {
        is_hidden: true,
      },
    },
  },
};

const GetDataStreamResponse: IndicesGetDataStreamResponse = {
  data_streams: [
    {
      name: 'ignored',
      generation: 1,
      timestamp_field: { name: 'ignored' },
      hidden: true,
      indices: [
        {
          index_name: 'ignored',
          index_uuid: 'ignored',
          managed_by: 'Data stream lifecycle',
          prefer_ilm: false,
        },
      ],
      status: 'green',
      template: 'ignored',
      next_generation_managed_by: 'Data stream lifecycle',
      prefer_ilm: false,
    },
  ],
};

const getSpaceResourcesInitialized = async (
  assistantService: AIAssistantService,
  namespace: string = DEFAULT_NAMESPACE_STRING
) => {
  const { result } = await assistantService.getSpaceResourcesInitializationPromise(namespace);
  return result;
};

const conversationsDataClient = conversationsDataClientMock.create();

const mockUser1 = authenticatedUser;

describe('AI Assistant Service', () => {
  let pluginStop$: Subject<void>;
  let assistantServiceOpts: AIAssistantServiceOpts;
  let ml: MlPluginSetup;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggingSystemMock.createLogger();
    pluginStop$ = new ReplaySubject(1);
    jest.spyOn(global.Math, 'random').mockReturnValue(0.01);
    clusterClient.indices.simulateTemplate.mockImplementation(async () => SimulateTemplateResponse);
    clusterClient.indices.simulateIndexTemplate.mockImplementation(
      async () => SimulateTemplateResponse
    );
    clusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);
    clusterClient.indices.getDataStream.mockImplementation(async () => GetDataStreamResponse);
    ml = mlPluginMock.createSetupContract() as unknown as MlPluginSetup; // Missing SharedServices mock, so manually mocking trainedModelsProvider
    ml.trainedModelsProvider = jest.fn().mockImplementation(() => ({
      getELSER: jest.fn().mockImplementation(() => '.elser_model_2'),
    }));
    assistantServiceOpts = {
      logger,
      elasticsearchClientPromise: Promise.resolve(clusterClient),
      pluginStop$,
      kibanaVersion: '8.8.0',
      ml,
      taskManager: taskManagerMock.createSetup(),
      productDocManager: Promise.resolve({
        getStatus: jest.fn(),
        install: jest.fn(),
        update: jest.fn(),
        uninstall: jest.fn(),
      }),
    };
  });

  afterEach(() => {
    pluginStop$.next();
    pluginStop$.complete();
  });

  describe('AIAssistantService()', () => {
    test('should correctly initialize common resources', async () => {
      const assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => (await assistantService.isInitialized()) === true
      );

      expect(assistantService.isInitialized()).toEqual(true);

      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(6);

      const expectedTemplates = [
        '.kibana-elastic-ai-assistant-component-template-conversations',
        '.kibana-elastic-ai-assistant-component-template-knowledge-base',
        '.kibana-elastic-ai-assistant-component-template-prompts',
        '.kibana-elastic-ai-assistant-component-template-anonymization-fields',
        '.kibana-elastic-ai-assistant-component-template-attack-discovery',
        '.kibana-elastic-ai-assistant-component-template-defend-insights',
      ];
      expectedTemplates.forEach((t, i) => {
        expect(clusterClient.cluster.putComponentTemplate.mock.calls[i][0].name).toEqual(t);
      });
    });

    test('should log error and set initialized to false if creating/updating common component template throws error', async () => {
      clusterClient.cluster.putComponentTemplate.mockRejectedValueOnce(new Error('fail'));
      const assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil('error log called', async () => logger.error.mock.calls.length > 0);

      expect(assistantService.isInitialized()).toEqual(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Error installing component template .kibana-elastic-ai-assistant-component-template-conversations - fail`
      );
    });
  });

  describe('createAIAssistantConversationsDataClient()', () => {
    let assistantService: AIAssistantService;
    beforeEach(() => {
      (AIAssistantConversationsDataClient as jest.Mock).mockImplementation(
        () => conversationsDataClient
      );
      (clusterClient.search as unknown as jest.Mock).mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
      });
    });

    test('should create new AIAssistantConversationsDataClient', async () => {
      assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );

      await assistantService.createAIAssistantConversationsDataClient({
        logger,
        spaceId: 'default',
        currentUser: mockUser1,
        licensing,
      });

      expect(AIAssistantConversationsDataClient).toHaveBeenCalledWith({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        spaceId: 'default',
        indexPatternsResourceName: '.kibana-elastic-ai-assistant-conversations',
        currentUser: mockUser1,
        kibanaVersion: '8.8.0',
      });
    });

    test('should retry initializing common resources if common resource initialization failed', async () => {
      clusterClient.cluster.putComponentTemplate.mockRejectedValueOnce(new Error('fail'));

      assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil('error log called', async () => logger.error.mock.calls.length > 0);

      expect(assistantService.isInitialized()).toEqual(false);

      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();

      const result = await assistantService.createAIAssistantConversationsDataClient({
        logger,
        spaceId: 'default',
        currentUser: mockUser1,
        licensing,
      });

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();

      expect(clusterClient.indices.createDataStream).not.toHaveBeenCalled();
      expect(clusterClient.indices.getDataStream).toHaveBeenCalled();

      expect(AIAssistantConversationsDataClient).toHaveBeenCalledWith({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        spaceId: 'default',
        indexPatternsResourceName: '.kibana-elastic-ai-assistant-conversations',
        currentUser: mockUser1,
        kibanaVersion: '8.8.0',
      });

      expect(result).not.toBe(null);
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(
        `Installing component template .kibana-elastic-ai-assistant-component-template-conversations`
      );
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(`Retrying resource initialization for "default"`);
    });

    test('should not retry initializing common resources if common resource initialization is in progress', async () => {
      // this is the initial call that fails
      clusterClient.cluster.putComponentTemplate.mockRejectedValueOnce(new Error('fail'));

      // this is the retry call that we'll artificially inflate the duration of
      clusterClient.cluster.putComponentTemplate.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 1000));
        return { acknowledged: true };
      });

      assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil('error log called', async () => logger.error.mock.calls.length > 0);

      expect(assistantService.isInitialized()).toEqual(false);

      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();

      // call createAIAssistantConversationsDataClient at the same time which will trigger the retries
      const result = await Promise.all([
        assistantService.createAIAssistantConversationsDataClient({
          logger,
          spaceId: 'default',
          currentUser: mockUser1,
          licensing,
        }),
        assistantService.createAIAssistantConversationsDataClient({
          logger,
          spaceId: 'default',
          currentUser: mockUser1,
          licensing,
        }),
      ]);

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).toHaveBeenCalled();

      expect(clusterClient.indices.createDataStream).not.toHaveBeenCalled();
      expect(clusterClient.indices.getDataStream).toHaveBeenCalled();

      expect(AIAssistantConversationsDataClient).toHaveBeenCalledWith({
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        spaceId: 'default',
        indexPatternsResourceName: '.kibana-elastic-ai-assistant-conversations',
        currentUser: mockUser1,
        kibanaVersion: '8.8.0',
        logger,
      });

      expect(result[0]).not.toBe(null);
      expect(result[1]).not.toBe(null);
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(
        `Installing component template .kibana-elastic-ai-assistant-component-template-conversations`
      );
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(`Retrying resource initialization for "default"`);
      expect(logger.info).toHaveBeenCalledWith(
        `Resource installation for "default" succeeded after retry`
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Skipped retrying common resource initialization because it is already being retried.`
      );
    });

    test('should retry initializing space specific resources if space specific resource initialization failed', async () => {
      clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
        ...SimulateTemplateResponse,
        template: {
          ...SimulateTemplateResponse.template,
          mappings: {},
        },
      }));

      clusterClient.indices.simulateIndexTemplate.mockImplementationOnce(async () => ({
        ...SimulateTemplateResponse,
        template: {
          ...SimulateTemplateResponse.template,
          mappings: {},
        },
      }));
      assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );

      const result = await assistantService.createAIAssistantConversationsDataClient({
        logger,
        spaceId: 'default',
        currentUser: mockUser1,
        licensing,
      });

      expect(AIAssistantConversationsDataClient).toHaveBeenCalledWith({
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        spaceId: 'default',
        indexPatternsResourceName: '.kibana-elastic-ai-assistant-conversations',
        currentUser: mockUser1,
        kibanaVersion: '8.8.0',
        logger,
      });

      expect(result).not.toBe(null);

      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(`Retrying resource initialization for "default"`);
      expect(logger.info).toHaveBeenCalledWith(
        `Resource installation for "default" succeeded after retry`
      );
    });

    test('should not retry initializing context specific resources if context specific resource initialization is in progress', async () => {
      // this is the initial call that fails
      clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
        ...SimulateTemplateResponse,
        template: {
          ...SimulateTemplateResponse.template,
          mappings: {},
        },
      }));

      clusterClient.indices.simulateIndexTemplate.mockImplementationOnce(async () => ({
        ...SimulateTemplateResponse,
        template: {
          ...SimulateTemplateResponse.template,
          mappings: {},
        },
      }));

      // this is the retry call that we'll artificially inflate the duration of
      clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 1000));
        return SimulateTemplateResponse;
      });

      assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );

      const createAIAssistantDatastreamClientWithDelay = async (delayMs: number | null) => {
        if (delayMs) {
          await new Promise((r) => setTimeout(r, delayMs));
        }

        return assistantService.createAIAssistantConversationsDataClient({
          logger,
          spaceId: 'default',
          currentUser: mockUser1,
          licensing,
        });
      };

      const result = await Promise.all([
        createAIAssistantDatastreamClientWithDelay(null),
        createAIAssistantDatastreamClientWithDelay(1),
      ]);

      expect(AIAssistantConversationsDataClient).toHaveBeenCalledTimes(2);
      expect(AIAssistantConversationsDataClient).toHaveBeenCalledWith({
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        spaceId: 'default',
        indexPatternsResourceName: '.kibana-elastic-ai-assistant-conversations',
        currentUser: mockUser1,
        kibanaVersion: '8.8.0',
        logger,
      });

      expect(result[0]).not.toBe(null);
      expect(result[1]).not.toBe(null);
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);

      // Should only log the retry once because the second call should
      // leverage the outcome of the first retry
      expect(
        logger.info.mock.calls.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (calls: any[]) => calls[0] === `Retrying resource initialization for "default"`
        ).length
      ).toEqual(1);
      expect(
        logger.info.mock.calls.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (calls: any[]) => calls[0] === `Resource installation for "default" succeeded after retry`
        ).length
      ).toEqual(1);
    });

    test('should throttle retries of initializing context specific resources', async () => {
      // this is the initial call that fails
      clusterClient.indices.simulateTemplate.mockImplementation(async () => ({
        ...SimulateTemplateResponse,
        template: {
          ...SimulateTemplateResponse.template,
          mappings: {},
        },
      }));

      clusterClient.indices.simulateIndexTemplate.mockImplementation(async () => ({
        ...SimulateTemplateResponse,
        template: {
          ...SimulateTemplateResponse.template,
          mappings: {},
        },
      }));

      assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );

      const createAIAssistantDatastreamClientWithDelay = async (delayMs: number | null) => {
        if (delayMs) {
          await new Promise((r) => setTimeout(r, delayMs));
        }

        return assistantService.createAIAssistantConversationsDataClient({
          logger,
          spaceId: 'default',
          currentUser: mockUser1,
          licensing,
        });
      };

      await Promise.all([
        createAIAssistantDatastreamClientWithDelay(null),
        createAIAssistantDatastreamClientWithDelay(1),
        createAIAssistantDatastreamClientWithDelay(2),
      ]);

      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);

      // Should only log the retry once because the second and third retries should be throttled
      expect(
        logger.info.mock.calls.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (calls: any[]) => calls[0] === `Retrying resource initialization for "default"`
        ).length
      ).toEqual(1);
    });

    test('should return null if retrying common resources initialization fails again', async () => {
      let failCount = 0;
      clusterClient.cluster.putComponentTemplate.mockImplementation(() => {
        throw new Error(`fail ${++failCount}`);
      });

      assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil('error log called', async () => logger.error.mock.calls.length > 0, 1);

      expect(assistantService.isInitialized()).toEqual(false);

      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();

      const result = await assistantService.createAIAssistantConversationsDataClient({
        logger,
        spaceId: 'test',
        currentUser: mockUser1,
        licensing,
      });

      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();

      expect(result).toBe(null);
      expect(AIAssistantConversationsDataClient).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(
        `Installing component template .kibana-elastic-ai-assistant-component-template-conversations`
      );
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(`Retrying resource initialization for "test"`);

      expect(logger.warn).toHaveBeenCalledWith(
        `Common resources were not initialized, cannot initialize resources for test`
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `Common resources were not initialized, cannot initialize resources for test`
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `There was an error in the framework installing spaceId-level resources and creating concrete indices for spaceId "test" - Retry failed with errors: Failure during installation of create or update .kibana-elastic-ai-assistant-component-template-conversations component template. fail 1`
      );
    });

    test('should return null if retrying common resources initialization fails again with same error', async () => {
      clusterClient.cluster.putComponentTemplate.mockRejectedValue(new Error('fail'));

      assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil('error log called', async () => logger.error.mock.calls.length > 0);

      expect(assistantService.isInitialized()).toEqual(false);

      // Installing component template failed so no calls to install context-specific resources
      // should be made
      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();

      const result = await assistantService.createAIAssistantConversationsDataClient({
        logger,
        spaceId: 'test',
        currentUser: mockUser1,
        licensing,
      });

      expect(clusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(clusterClient.indices.getAlias).not.toHaveBeenCalled();
      expect(clusterClient.indices.putSettings).not.toHaveBeenCalled();
      expect(clusterClient.indices.create).not.toHaveBeenCalled();

      expect(result).toBe(null);
      expect(AIAssistantConversationsDataClient).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(
        `Installing component template .kibana-elastic-ai-assistant-component-template-conversations`
      );
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(`Retrying resource initialization for "test"`);
      expect(logger.warn).toHaveBeenCalledWith(
        `Common resources were not initialized, cannot initialize resources for test`
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `Common resources were not initialized, cannot initialize resources for test`
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `There was an error in the framework installing spaceId-level resources and creating concrete indices for spaceId "test" - Retry failed with errors: Failure during installation of create or update .kibana-elastic-ai-assistant-component-template-conversations component template. fail`
      );
    });

    test('should return null if retrying space specific initialization fails again', async () => {
      clusterClient.indices.simulateTemplate.mockImplementationOnce(async () => ({
        ...SimulateTemplateResponse,
        template: {
          ...SimulateTemplateResponse.template,
          mappings: {},
        },
      }));
      clusterClient.indices.putIndexTemplate.mockRejectedValue(new Error('fail index template'));

      assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );

      const result = await assistantService.createAIAssistantConversationsDataClient({
        logger,
        spaceId: 'test',
        currentUser: mockUser1,
        licensing,
      });

      expect(AIAssistantConversationsDataClient).not.toHaveBeenCalled();
      expect(result).toBe(null);
      expect(logger.info).toHaveBeenCalledWith(`Retrying common resource initialization`);
      expect(logger.info).toHaveBeenCalledWith(
        `Installing component template .kibana-elastic-ai-assistant-component-template-conversations`
      );

      expect(logger.warn).toHaveBeenCalledWith(
        `Common resources were not initialized, cannot initialize resources for test`
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `Common resources were not initialized, cannot initialize resources for test`
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `There was an error in the framework installing spaceId-level resources and creating concrete indices for spaceId \"test\" - Retry failed with errors: Failure during installation of create or update .kibana-elastic-ai-assistant-index-template-conversations index template. No mappings would be generated for .kibana-elastic-ai-assistant-index-template-conversations, possibly due to failed/misconfigured bootstrapping`
      );
    });
  });

  describe('retries', () => {
    test('should retry adding component template for transient ES errors', async () => {
      clusterClient.cluster.putComponentTemplate
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      const assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );
      expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(8);

      const expectedTemplates = [
        '.kibana-elastic-ai-assistant-component-template-conversations',
        '.kibana-elastic-ai-assistant-component-template-conversations',
        '.kibana-elastic-ai-assistant-component-template-conversations',
        '.kibana-elastic-ai-assistant-component-template-knowledge-base',
        '.kibana-elastic-ai-assistant-component-template-prompts',
        '.kibana-elastic-ai-assistant-component-template-anonymization-fields',
        '.kibana-elastic-ai-assistant-component-template-attack-discovery',
        '.kibana-elastic-ai-assistant-component-template-defend-insights',
      ];
      expectedTemplates.forEach((t, i) => {
        expect(clusterClient.cluster.putComponentTemplate.mock.calls[i][0].name).toEqual(t);
      });
    });

    test('should retry updating index template for transient ES errors', async () => {
      clusterClient.indices.putIndexTemplate
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      const assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );
      expect(assistantService.isInitialized()).toEqual(true);

      await retryUntil(
        'space resources initialized',
        async () => (await getSpaceResourcesInitialized(assistantService)) === true
      );

      expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(8);
      const expectedTemplates = [
        '.kibana-elastic-ai-assistant-index-template-conversations',
        '.kibana-elastic-ai-assistant-index-template-conversations',
        '.kibana-elastic-ai-assistant-index-template-conversations',
        '.kibana-elastic-ai-assistant-index-template-knowledge-base',
        '.kibana-elastic-ai-assistant-index-template-prompts',
        '.kibana-elastic-ai-assistant-index-template-anonymization-fields',
        '.kibana-elastic-ai-assistant-index-template-attack-discovery',
        '.kibana-elastic-ai-assistant-index-template-defend-insights',
      ];
      expectedTemplates.forEach((t, i) => {
        expect(clusterClient.indices.putIndexTemplate.mock.calls[i][0].name).toEqual(t);
      });
    });

    test('should retry updating index settings for existing indices for transient ES errors', async () => {
      clusterClient.indices.putSettings
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      const assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );

      await retryUntil(
        'space resources initialized',
        async () => (await getSpaceResourcesInitialized(assistantService)) === true
      );

      expect(clusterClient.indices.putSettings).toHaveBeenCalledTimes(8);
    });

    test('should retry updating index mappings for existing indices for transient ES errors', async () => {
      clusterClient.indices.putMapping
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      const assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );

      await retryUntil(
        'space resources initialized',
        async () => (await getSpaceResourcesInitialized(assistantService)) === true
      );

      expect(clusterClient.indices.putMapping).toHaveBeenCalledTimes(8);
    });

    test('should retry creating concrete index for transient ES errors', async () => {
      clusterClient.indices.getDataStream.mockImplementation(async () => ({
        data_streams: [],
      }));
      clusterClient.indices.createDataStream
        .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
        .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
        .mockResolvedValue({ acknowledged: true });
      (clusterClient.search as unknown as jest.Mock).mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
      });

      const assistantService = new AIAssistantService(assistantServiceOpts);

      await retryUntil(
        'AI Assistant service initialized',
        async () => assistantService.isInitialized() === true
      );

      await assistantService.createAIAssistantConversationsDataClient({
        logger,
        spaceId: 'default',
        currentUser: mockUser1,
        licensing,
      });

      await retryUntil(
        'space resources initialized',
        async () => (await getSpaceResourcesInitialized(assistantService)) === true
      );

      expect(clusterClient.indices.createDataStream).toHaveBeenCalledTimes(6);
    });
  });
});
