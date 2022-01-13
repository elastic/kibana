/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import type { AgentPolicy, PackagePolicy } from '../types';

import { agentPolicyService, packagePolicyService } from '.';
import { createAgentPolicyWithPackages } from './agent_policy_create';
import { bulkInstallPackages } from './epm/packages';
import { incrementPackageName } from './package_policy';

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockIncrementPackageName = incrementPackageName as jest.MockedFunction<
  typeof incrementPackageName
>;

jest.mock('./epm/packages', () => {
  return {
    bulkInstallPackages: jest.fn(),
  };
});

const mockedBulkInstallPackages = bulkInstallPackages as jest.Mocked<typeof bulkInstallPackages>;

jest.mock('./setup', () => {
  return {
    ensureDefaultEnrollmentAPIKeysExists: jest.fn(),
  };
});

jest.mock('./agent_policy');
jest.mock('./package_policy');

function getPackagePolicy(name: string, policyId = '') {
  return {
    name,
    namespace: 'default',
    enabled: true,
    policy_id: policyId,
    output_id: '',
    inputs: [],
  };
}

describe('createAgentPolicyWithPackages', () => {
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const soClientMock = savedObjectsClientMock.create();

  beforeEach(() => {
    mockedAgentPolicyService.get.mockRejectedValue({ output: { statusCode: 404 }, isBoom: true });
    mockedAgentPolicyService.create.mockImplementation((soClient, esClient, newPolicy, options) =>
      Promise.resolve({
        ...newPolicy,
        id: options?.id || 'new_id',
      } as AgentPolicy)
    );
    mockedAgentPolicyService.deployPolicy.mockResolvedValue();

    mockedPackagePolicyService.buildPackagePolicyFromPackage.mockImplementation(
      (soClient, packageToInstall) => Promise.resolve(getPackagePolicy(packageToInstall))
    );
    mockIncrementPackageName.mockImplementation((soClient: any, pkg: string) =>
      Promise.resolve(`${pkg}-1`)
    );
    mockedPackagePolicyService.create.mockImplementation((soClient, esClient, newPolicy) =>
      Promise.resolve({
        ...newPolicy,
      } as PackagePolicy)
    );
  });
  it('should create policy with fleet_server, system and elastic_agent package - first one', async () => {
    const response = await createAgentPolicyWithPackages({
      esClient: esClientMock,
      soClient: soClientMock,
      newPolicy: { name: 'Fleet Server policy', namespace: 'default' },
      hasFleetServer: true,
      withSysMonitoring: true,
      monitoringEnabled: ['logs', 'metrics'],
      spaceId: 'default',
    });

    expect(response.id).toEqual('fleet-server-policy');
    expect(response.is_default_fleet_server).toBe(true);
    expect(mockedBulkInstallPackages).toHaveBeenCalledWith({
      savedObjectsClient: soClientMock,
      esClient: esClientMock,
      packagesToInstall: ['fleet_server', 'system', 'elastic_agent'],
      spaceId: 'default',
    });
    expect(mockedPackagePolicyService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      getPackagePolicy('system-1', 'fleet-server-policy'),
      expect.anything()
    );
    expect(mockedPackagePolicyService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      getPackagePolicy('fleet_server-1', 'fleet-server-policy'),
      expect.anything()
    );
  });
  it('should create policy with fleet_server package', async () => {
    mockedAgentPolicyService.get.mockResolvedValueOnce({} as AgentPolicy);
    const response = await createAgentPolicyWithPackages({
      esClient: esClientMock,
      soClient: soClientMock,
      newPolicy: { name: 'Fleet Server policy 2', namespace: 'default' },
      hasFleetServer: true,
      withSysMonitoring: false,
      monitoringEnabled: [],
      spaceId: 'default',
    });

    expect(response.id).toEqual('new_id');
    expect(mockedBulkInstallPackages).toHaveBeenCalledWith({
      savedObjectsClient: soClientMock,
      esClient: esClientMock,
      packagesToInstall: ['fleet_server'],
      spaceId: 'default',
    });
    expect(mockedPackagePolicyService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      getPackagePolicy('fleet_server-1', 'new_id'),
      expect.anything()
    );
  });
  it('should create policy with system package', async () => {
    const response = await createAgentPolicyWithPackages({
      esClient: esClientMock,
      soClient: soClientMock,
      newPolicy: { name: 'Agent policy 1', namespace: 'default' },
      withSysMonitoring: true,
      spaceId: 'default',
    });

    expect(response.id).toEqual('new_id');
    expect(mockedBulkInstallPackages).toHaveBeenCalledWith({
      savedObjectsClient: soClientMock,
      esClient: esClientMock,
      packagesToInstall: ['system'],
      spaceId: 'default',
    });
    expect(mockedPackagePolicyService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      getPackagePolicy('system-1', 'new_id'),
      expect.anything()
    );
  });

  it('should create policy with system and elastic_agent package', async () => {
    const response = await createAgentPolicyWithPackages({
      esClient: esClientMock,
      soClient: soClientMock,
      newPolicy: { name: 'Agent policy 1', namespace: 'default' },
      withSysMonitoring: true,
      spaceId: 'default',
      monitoringEnabled: ['logs'],
    });

    expect(response.id).toEqual('new_id');
    expect(mockedBulkInstallPackages).toHaveBeenCalledWith({
      savedObjectsClient: soClientMock,
      esClient: esClientMock,
      packagesToInstall: ['system', 'elastic_agent'],
      spaceId: 'default',
    });
    expect(mockedPackagePolicyService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      getPackagePolicy('system-1', 'new_id'),
      expect.anything()
    );
  });
});
