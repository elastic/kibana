/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';
import { postAttackDiscoveryRoute } from './post_attack_discovery';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { AttackDiscoveryDataClient } from '../../ai_assistant_data_clients/attack_discovery';
import { transformESSearchToAttackDiscovery } from '../../ai_assistant_data_clients/attack_discovery/transforms';
import { getAttackDiscoverySearchEsMock } from '../../__mocks__/attack_discovery_schema.mock';
import { postAttackDiscoveryRequest } from '../../__mocks__/request';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { AttackDiscoveryPostRequestBody } from '@kbn/elastic-assistant-common';
import {
  getAssistantTool,
  getAssistantToolParams,
  updateAttackDiscoveryStatusToRunning,
} from './helpers';
jest.mock('./helpers');

const { clients, context } = requestContextMock.createTools();
const server: ReturnType<typeof serverMock.create> = serverMock.create();
clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

const mockUser = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;
const findAttackDiscoveryByConnectorId = jest.fn();
const mockDataClient = {
  findAttackDiscoveryByConnectorId,
  updateAttackDiscovery: jest.fn(),
  createAttackDiscovery: jest.fn(),
  getAttackDiscovery: jest.fn(),
} as unknown as AttackDiscoveryDataClient;
const mockApiConfig = {
  connectorId: 'connector-id',
  actionTypeId: '.bedrock',
  model: 'model',
  provider: OpenAiProviderType.OpenAi,
};
const mockRequestBody: AttackDiscoveryPostRequestBody = {
  subAction: 'invokeAI',
  apiConfig: mockApiConfig,
  alertsIndexPattern: 'alerts-*',
  anonymizationFields: [],
  replacements: {},
  model: 'gpt-4',
  size: 20,
  langSmithProject: 'langSmithProject',
  langSmithApiKey: 'langSmithApiKey',
};
const mockCurrentAd = transformESSearchToAttackDiscovery(getAttackDiscoverySearchEsMock())[0];
const runningAd = {
  ...mockCurrentAd,
  status: 'running',
};
describe('postAttackDiscoveryRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser);
    context.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(mockDataClient);
    context.elasticAssistant.actions = actionsMock.createStart();
    postAttackDiscoveryRoute(server.router);
    findAttackDiscoveryByConnectorId.mockResolvedValue(mockCurrentAd);
    (getAssistantTool as jest.Mock).mockReturnValue({ getTool: jest.fn() });
    (getAssistantToolParams as jest.Mock).mockReturnValue({ tool: 'tool' });
    (updateAttackDiscoveryStatusToRunning as jest.Mock).mockResolvedValue({
      currentAd: runningAd,
      attackDiscoveryId: mockCurrentAd.id,
    });
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(runningAd);
  });

  it('should handle missing authenticated user', async () => {
    context.elasticAssistant.getCurrentUser.mockReturnValue(null);
    const response = await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(401);
    expect(response.body).toEqual({
      message: 'Authenticated user not found',
      status_code: 401,
    });
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(null);
    const response = await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle assistantTool null response', async () => {
    (getAssistantTool as jest.Mock).mockReturnValue(null);
    const response = await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(404);
  });

  it('should handle updateAttackDiscoveryStatusToRunning error', async () => {
    (updateAttackDiscoveryStatusToRunning as jest.Mock).mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      postAttackDiscoveryRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: {
        error: 'Oh no!',
        success: false,
      },
      status_code: 500,
    });
  });
});
