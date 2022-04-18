/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../routes/security');
jest.mock('./crud');
jest.mock('./status');

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import { FleetUnauthorizedError } from '../../errors';

import { getAuthzFromRequest } from '../../routes/security';
import type { FleetAuthz } from '../../../common';

import type { AgentClient } from './agent_service';
import { AgentServiceImpl } from './agent_service';
import { getAgentsByKuery, getAgentById } from './crud';
import { getAgentStatusById, getAgentStatusForAgentPolicy } from './status';

const mockGetAuthzFromRequest = getAuthzFromRequest as jest.Mock<Promise<FleetAuthz>>;
const mockGetAgentsByKuery = getAgentsByKuery as jest.Mock;
const mockGetAgentById = getAgentById as jest.Mock;
const mockGetAgentStatusById = getAgentStatusById as jest.Mock;
const mockGetAgentStatusForAgentPolicy = getAgentStatusForAgentPolicy as jest.Mock;

describe('AgentService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('asScoped', () => {
    describe('without required privilege', () => {
      const agentClient = new AgentServiceImpl(
        elasticsearchServiceMock.createElasticsearchClient()
      ).asScoped(httpServerMock.createKibanaRequest());

      beforeEach(() =>
        mockGetAuthzFromRequest.mockReturnValue(
          Promise.resolve({
            fleet: {
              all: false,
              setup: false,
              readEnrollmentTokens: false,
              readAgentPolicies: false,
            },
            integrations: {
              readPackageInfo: false,
              readInstalledPackages: false,
              installPackages: false,
              upgradePackages: false,
              uploadPackages: false,
              removePackages: false,
              readPackageSettings: false,
              writePackageSettings: false,
              readIntegrationPolicies: false,
              writeIntegrationPolicies: false,
            },
          })
        )
      );

      it('rejects on listAgents', async () => {
        await expect(agentClient.listAgents({ showInactive: true })).rejects.toThrowError(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet agents.`
          )
        );
      });

      it('rejects on getAgent', async () => {
        await expect(agentClient.getAgent('foo')).rejects.toThrowError(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet agents.`
          )
        );
      });

      it('rejects on getAgentStatusById', async () => {
        await expect(agentClient.getAgentStatusById('foo')).rejects.toThrowError(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet agents.`
          )
        );
      });

      it('rejects on getAgentStatusForAgentPolicy', async () => {
        await expect(agentClient.getAgentStatusForAgentPolicy()).rejects.toThrowError(
          new FleetUnauthorizedError(
            `User does not have adequate permissions to access Fleet agents.`
          )
        );
      });
    });

    describe('with required privilege', () => {
      const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
      const agentClient = new AgentServiceImpl(mockEsClient).asScoped(
        httpServerMock.createKibanaRequest()
      );

      beforeEach(() =>
        mockGetAuthzFromRequest.mockReturnValue(
          Promise.resolve({
            fleet: {
              all: true,
              setup: true,
              readEnrollmentTokens: true,
              readAgentPolicies: true,
            },
            integrations: {
              readPackageInfo: true,
              readInstalledPackages: true,
              installPackages: true,
              upgradePackages: true,
              uploadPackages: true,
              removePackages: true,
              readPackageSettings: true,
              writePackageSettings: true,
              readIntegrationPolicies: true,
              writeIntegrationPolicies: true,
            },
          })
        )
      );

      expectApisToCallServicesSuccessfully(mockEsClient, agentClient);
    });
  });

  describe('asInternalUser', () => {
    const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    const agentClient = new AgentServiceImpl(mockEsClient).asInternalUser;

    expectApisToCallServicesSuccessfully(mockEsClient, agentClient);
  });
});

function expectApisToCallServicesSuccessfully(
  mockEsClient: ElasticsearchClient,
  agentClient: AgentClient
) {
  test('client.listAgents calls getAgentsByKuery and returns results', async () => {
    mockGetAgentsByKuery.mockResolvedValue('getAgentsByKuery success');
    await expect(agentClient.listAgents({ showInactive: true })).resolves.toEqual(
      'getAgentsByKuery success'
    );
    expect(mockGetAgentsByKuery).toHaveBeenCalledWith(mockEsClient, { showInactive: true });
  });

  test('client.getAgent calls getAgentById and returns results', async () => {
    mockGetAgentById.mockResolvedValue('getAgentById success');
    await expect(agentClient.getAgent('foo-id')).resolves.toEqual('getAgentById success');
    expect(mockGetAgentById).toHaveBeenCalledWith(mockEsClient, 'foo-id');
  });

  test('client.getAgentStatusById calls getAgentStatusById and returns results', async () => {
    mockGetAgentStatusById.mockResolvedValue('getAgentStatusById success');
    await expect(agentClient.getAgentStatusById('foo-id')).resolves.toEqual(
      'getAgentStatusById success'
    );
    expect(mockGetAgentStatusById).toHaveBeenCalledWith(mockEsClient, 'foo-id');
  });

  test('client.getAgentStatusForAgentPolicy calls getAgentStatusForAgentPolicy and returns results', async () => {
    mockGetAgentStatusForAgentPolicy.mockResolvedValue('getAgentStatusForAgentPolicy success');
    await expect(agentClient.getAgentStatusForAgentPolicy('foo-id', 'foo-filter')).resolves.toEqual(
      'getAgentStatusForAgentPolicy success'
    );
    expect(mockGetAgentStatusForAgentPolicy).toHaveBeenCalledWith(
      mockEsClient,
      'foo-id',
      'foo-filter'
    );
  });
}
