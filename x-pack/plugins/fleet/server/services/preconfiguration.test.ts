/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import type { PreconfiguredAgentPolicy } from '../../common/types';
import type { AgentPolicy, NewPackagePolicy, Output } from '../types';

import { ensurePreconfiguredPackagesAndPolicies } from './preconfiguration';

const mockInstalledPackages = new Map();
const mockConfiguredPolicies = new Map();

const mockDefaultOutput: Output = {
  id: 'test-id',
  is_default: true,
  name: 'default',
  // @ts-ignore
  type: 'elasticsearch',
  hosts: ['http://127.0.0.1:9201'],
};

function getPutPreconfiguredPackagesMock() {
  const soClient = savedObjectsClientMock.create();
  soClient.find.mockImplementation(async ({ type, search }) => {
    const attributes = mockConfiguredPolicies.get(search!.replace(/"/g, ''));
    if (attributes) {
      return {
        saved_objects: [
          {
            id: `mocked-${attributes.preconfiguration_id}`,
            attributes,
            type: type as string,
            score: 1,
            references: [],
          },
        ],
        total: 1,
        page: 1,
        per_page: 1,
      };
    } else {
      return {
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 0,
      };
    }
  });
  soClient.create.mockImplementation(async (type, policy) => {
    const attributes = policy as AgentPolicy;
    mockConfiguredPolicies.set(attributes.preconfiguration_id, attributes);
    return {
      id: `mocked-${attributes.preconfiguration_id}`,
      attributes,
      type,
      references: [],
    };
  });
  return soClient;
}

jest.mock('./epm/packages/install', () => ({
  ensureInstalledPackage({ pkgName, pkgVersion }: { pkgName: string; pkgVersion: string }) {
    const installedPackage = mockInstalledPackages.get(pkgName);
    if (installedPackage) return installedPackage;

    const packageInstallation = { name: pkgName, version: pkgVersion, title: pkgName };
    mockInstalledPackages.set(pkgName, packageInstallation);
    return packageInstallation;
  },
}));

jest.mock('./epm/packages/get', () => ({
  getPackageInfo({ pkgName }: { pkgName: string }) {
    const installedPackage = mockInstalledPackages.get(pkgName);
    if (!installedPackage) return { status: 'not_installed' };
    return {
      status: 'installed',
      ...installedPackage,
    };
  },
  getInstallation({ pkgName }: { pkgName: string }) {
    return mockInstalledPackages.get(pkgName) ?? false;
  },
}));

jest.mock('./package_policy', () => ({
  packagePolicyService: {
    create(soClient: any, esClient: any, newPackagePolicy: NewPackagePolicy) {
      return {
        id: 'mocked',
        version: 'mocked',
        ...newPackagePolicy,
      };
    },
  },
}));

jest.mock('./agents/setup', () => ({
  isAgentsSetup() {
    return false;
  },
}));

describe('policy preconfiguration', () => {
  beforeEach(() => {
    mockInstalledPackages.clear();
    mockConfiguredPolicies.clear();
  });

  it('should perform a no-op when passed no policies or packages', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const { policies, packages } = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      [],
      [],
      mockDefaultOutput
    );

    expect(policies.length).toBe(0);
    expect(packages.length).toBe(0);
  });

  it('should install packages successfully', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const { policies, packages } = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      [],
      [{ name: 'test-package', version: '3.0.0' }],
      mockDefaultOutput
    );

    expect(policies.length).toBe(0);
    expect(packages).toEqual(expect.arrayContaining(['test-package:3.0.0']));
  });

  it('should install packages and configure agent policies successfully', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const { policies, packages } = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      [
        {
          name: 'Test policy',
          namespace: 'default',
          id: 'test-id',
          package_policies: [
            {
              package: { name: 'test-package' },
              name: 'Test package',
            },
          ],
        },
      ] as PreconfiguredAgentPolicy[],
      [{ name: 'test-package', version: '3.0.0' }],
      mockDefaultOutput
    );

    expect(policies.length).toEqual(1);
    expect(policies[0].id).toBe('mocked-test-id');
    expect(packages).toEqual(expect.arrayContaining(['test-package:3.0.0']));
  });

  it('should throw an error when trying to install duplicate packages', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    await expect(
      ensurePreconfiguredPackagesAndPolicies(
        soClient,
        esClient,
        [],
        [
          { name: 'test-package', version: '3.0.0' },
          { name: 'test-package', version: '2.0.0' },
        ],
        mockDefaultOutput
      )
    ).rejects.toThrow(
      'Duplicate packages specified in configuration: test-package:3.0.0, test-package:2.0.0'
    );
  });

  it('should not attempt to recreate or modify an agent policy if its ID is unchanged', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const { policies: policiesA } = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      [
        {
          name: 'Test policy',
          namespace: 'default',
          id: 'test-id',
          package_policies: [],
        },
      ] as PreconfiguredAgentPolicy[],
      [],
      mockDefaultOutput
    );

    expect(policiesA.length).toEqual(1);
    expect(policiesA[0].id).toBe('mocked-test-id');

    const { policies: policiesB } = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      [
        {
          name: 'Test policy redo',
          namespace: 'default',
          id: 'test-id',
          package_policies: [
            {
              package: { name: 'some-uninstalled-package' },
              name: 'This package is not installed',
            },
          ],
        },
      ] as PreconfiguredAgentPolicy[],
      [],
      mockDefaultOutput
    );

    expect(policiesB.length).toEqual(1);
    expect(policiesB[0].id).toBe('mocked-test-id');
    expect(policiesB[0].updated_at).toEqual(policiesA[0].updated_at);
  });
});
