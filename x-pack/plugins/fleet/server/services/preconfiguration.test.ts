/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

import type { PreconfiguredAgentPolicy } from '../../common/types';
import type { AgentPolicy, NewPackagePolicy, Output } from '../types';

import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../constants';

import { ensurePreconfiguredPackagesAndPolicies } from './preconfiguration';

jest.mock('./agent_policy_update');

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
    if (type === AGENT_POLICY_SAVED_OBJECT_TYPE) {
      const id = search!.replace(/"/g, '');
      const attributes = mockConfiguredPolicies.get(id);
      if (attributes) {
        return {
          saved_objects: [
            {
              id: `mocked-${id}`,
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
      }
    }
    return {
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 0,
    };
  });
  soClient.get.mockImplementation(async (type, id) => {
    const attributes = mockConfiguredPolicies.get(id);
    if (!attributes) throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    return {
      id: `mocked-${id}`,
      attributes,
      type: type as string,
      references: [],
    };
  });
  soClient.create.mockImplementation(async (type, policy, options) => {
    const attributes = policy as AgentPolicy;
    const { id } = options!;
    mockConfiguredPolicies.set(id, attributes);
    return {
      id: `mocked-${id}`,
      attributes,
      type,
      references: [],
    };
  });
  return soClient;
}

jest.mock('./epm/packages/install', () => ({
  installPackage({ pkgkey, force }: { pkgkey: string; force?: boolean }) {
    const [pkgName, pkgVersion] = pkgkey.split('-');
    const installedPackage = mockInstalledPackages.get(pkgName);
    if (installedPackage) {
      if (installedPackage.version === pkgVersion) return installedPackage;
    }

    const packageInstallation = { name: pkgName, version: pkgVersion, title: pkgName };
    mockInstalledPackages.set(pkgName, packageInstallation);

    return packageInstallation;
  },
  ensurePackagesCompletedInstall() {
    return [];
  },
  isPackageVersionOrLaterInstalled() {
    return false;
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

jest.mock('./app_context', () => ({
  appContextService: {
    getLogger: () =>
      new Proxy(
        {},
        {
          get() {
            return jest.fn();
          },
        }
      ),
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
      [{ name: 'test_package', version: '3.0.0' }],
      mockDefaultOutput
    );

    expect(policies.length).toBe(0);
    expect(packages).toEqual(expect.arrayContaining(['test_package-3.0.0']));
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
              package: { name: 'test_package' },
              name: 'Test package',
            },
          ],
        },
      ] as PreconfiguredAgentPolicy[],
      [{ name: 'test_package', version: '3.0.0' }],
      mockDefaultOutput
    );

    expect(policies.length).toEqual(1);
    expect(policies[0].id).toBe('mocked-test-id');
    expect(packages).toEqual(expect.arrayContaining(['test_package-3.0.0']));
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
          { name: 'test_package', version: '3.0.0' },
          { name: 'test_package', version: '2.0.0' },
        ],
        mockDefaultOutput
      )
    ).rejects.toThrow(
      'Duplicate packages specified in configuration: test_package-3.0.0, test_package-2.0.0'
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
