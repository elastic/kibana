/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { MockedKeys } from '@kbn/utility-types-jest';
import { AwaitedProperties } from '@kbn/utility-types';
import {
  ElasticAssistantApiRequestHandlerContext,
  ElasticAssistantRequestHandlerContext,
} from '../types';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { conversationsDataClientMock, dataClientMock } from './data_clients.mock';
import { AIAssistantConversationsDataClient } from '../ai_assistant_data_clients/conversations';
import { AIAssistantDataClient } from '../ai_assistant_data_clients';

export const createMockClients = () => {
  const core = coreMock.createRequestHandlerContext();
  const license = licensingMock.createLicenseMock();

  return {
    core,
    clusterClient: core.elasticsearch.client,
    elasticAssistant: {
      actions: actionsClientMock.create(),
      getRegisteredFeatures: jest.fn(),
      getRegisteredTools: jest.fn(),
      logger: loggingSystemMock.createLogger(),
      telemetry: coreMock.createSetup().analytics,
      getAIAssistantConversationsDataClient: conversationsDataClientMock.create(),
      getAIAssistantPromptsDataClient: dataClientMock.create(),
      getAIAssistantAnonymizationFieldsDataClient: dataClientMock.create(),
      getSpaceId: jest.fn(),
      getCurrentUser: jest.fn(),
    },
    savedObjectsClient: core.savedObjects.client,

    licensing: {
      ...licensingMock.createRequestHandlerContext({ license }),
      license,
    },

    config: createMockConfig(),
    appClient: createAppClientMock(),
  };
};

type MockClients = ReturnType<typeof createMockClients>;

export type ElasticAssistantRequestHandlerContextMock = MockedKeys<
  AwaitedProperties<Omit<ElasticAssistantRequestHandlerContext, 'resolve'>>
> & {
  core: MockClients['core'];
};

const createMockConfig = () => ({});

const createAppClientMock = () => ({});

const createRequestContextMock = (
  clients: MockClients = createMockClients()
): ElasticAssistantRequestHandlerContextMock => {
  return {
    core: clients.core,
    elasticAssistant: createElasticAssistantRequestContextMock(clients),
  };
};

const convertRequestContextMock = (
  context: AwaitedProperties<ElasticAssistantRequestHandlerContextMock>
): ElasticAssistantRequestHandlerContext => {
  return coreMock.createCustomRequestHandlerContext(
    context
  ) as unknown as ElasticAssistantRequestHandlerContext;
};

const createElasticAssistantRequestContextMock = (
  clients: MockClients
): jest.Mocked<ElasticAssistantApiRequestHandlerContext> => {
  return {
    actions: clients.elasticAssistant.actions as unknown as ActionsPluginStart,
    getRegisteredFeatures: jest.fn(),
    getRegisteredTools: jest.fn(),
    logger: clients.elasticAssistant.logger,

    getAIAssistantConversationsDataClient: jest.fn(
      () => clients.elasticAssistant.getAIAssistantConversationsDataClient
    ) as unknown as jest.MockInstance<
      Promise<AIAssistantConversationsDataClient | null>,
      [],
      unknown
    > &
      (() => Promise<AIAssistantConversationsDataClient | null>),

    getAIAssistantAnonymizationFieldsDataClient: jest.fn(
      () => clients.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient
    ) as unknown as jest.MockInstance<Promise<AIAssistantDataClient | null>, [], unknown> &
      (() => Promise<AIAssistantDataClient | null>),
    getAIAssistantPromptsDataClient: jest.fn(
      () => clients.elasticAssistant.getAIAssistantPromptsDataClient
    ) as unknown as jest.MockInstance<Promise<AIAssistantDataClient | null>, [], unknown> &
      (() => Promise<AIAssistantDataClient | null>),
    getCurrentUser: jest.fn(),
    getServerBasePath: jest.fn(),
    getSpaceId: jest.fn(),
    core: clients.core,
    telemetry: clients.elasticAssistant.telemetry,
  };
};

const createTools = () => {
  const clients = createMockClients();
  const context = createRequestContextMock(clients);

  return { clients, context };
};

export const requestContextMock = {
  create: createRequestContextMock,
  convertContext: convertRequestContextMock,
  createTools,
};
