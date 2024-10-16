/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cancelAttackDiscoveryRoute } from './cancel_attack_discovery';

import { AuthenticatedUser } from '@kbn/core-security-common';
import { serverMock } from '../../../../__mocks__/server';
import { requestContextMock } from '../../../../__mocks__/request_context';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { AttackDiscoveryDataClient } from '../../../../lib/attack_discovery/persistence';
import { transformESSearchToAttackDiscovery } from '../../../../lib/attack_discovery/persistence/transforms/transforms';
import { getAttackDiscoverySearchEsMock } from '../../../../__mocks__/attack_discovery_schema.mock';
import { getCancelAttackDiscoveryRequest } from '../../../../__mocks__/request';
import { updateAttackDiscoveryStatusToCanceled } from '../../helpers/helpers';

jest.mock('../../helpers/helpers', () => {
  const original = jest.requireActual('../../helpers/helpers');

  return {
    ...original,
    updateAttackDiscoveryStatusToCanceled: jest.fn(),
  };
});

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
const mockDataClient = {
  findAttackDiscoveryByConnectorId: jest.fn(),
  updateAttackDiscovery: jest.fn(),
  createAttackDiscovery: jest.fn(),
  getAttackDiscovery: jest.fn(),
} as unknown as AttackDiscoveryDataClient;
const mockCurrentAd = transformESSearchToAttackDiscovery(getAttackDiscoverySearchEsMock())[0];
describe('cancelAttackDiscoveryRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (updateAttackDiscoveryStatusToCanceled as jest.Mock).mockResolvedValue({
      ...mockCurrentAd,
      status: 'canceled',
    });
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser);
    context.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(mockDataClient);

    cancelAttackDiscoveryRoute(server.router);
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      getCancelAttackDiscoveryRequest('connector-id'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      ...mockCurrentAd,
      status: 'canceled',
    });
  });

  it('should handle missing authenticated user', async () => {
    context.elasticAssistant.getCurrentUser.mockReturnValue(null);
    const response = await server.inject(
      getCancelAttackDiscoveryRequest('connector-id'),
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
      getCancelAttackDiscoveryRequest('connector-id'),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Attack discovery data client not initialized',
      status_code: 500,
    });
  });

  it('should handle updateAttackDiscoveryStatusToCanceled error', async () => {
    (updateAttackDiscoveryStatusToCanceled as jest.Mock).mockRejectedValue(new Error('Oh no!'));
    const response = await server.inject(
      getCancelAttackDiscoveryRequest('connector-id'),
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
