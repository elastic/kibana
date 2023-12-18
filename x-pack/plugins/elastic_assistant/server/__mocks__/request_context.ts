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

export const createMockClients = () => {
  const core = coreMock.createRequestHandlerContext();
  const license = licensingMock.createLicenseMock();

  return {
    core,
    clusterClient: core.elasticsearch.client,
    elasticAssistant: {
      actions: actionsClientMock.create(),
      getRegisteredTools: jest.fn(),
      logger: loggingSystemMock.createLogger(),
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
    getRegisteredTools: jest.fn(),
    logger: clients.elasticAssistant.logger,
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
