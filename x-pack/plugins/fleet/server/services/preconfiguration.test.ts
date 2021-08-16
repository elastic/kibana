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

import * as agentPolicy from './agent_policy';

import {
  ensurePreconfiguredPackagesAndPolicies,
  comparePreconfiguredPolicyToCurrent,
} from './preconfiguration';

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

  soClient.delete.mockResolvedValue({});

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
  ...jest.requireActual('./package_policy'),
  packagePolicyService: {
    getByIDs: jest.fn().mockReturnValue([]),
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

const spyAgentPolicyServiceUpdate = jest.spyOn(agentPolicy.agentPolicyService, 'update');

describe('policy preconfiguration', () => {
  beforeEach(() => {
    mockInstalledPackages.clear();
    mockConfiguredPolicies.clear();
    spyAgentPolicyServiceUpdate.mockClear();
  });

  it('should perform a no-op when passed no policies or packages', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const { policies, packages, nonFatalErrors } = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      [],
      [],
      mockDefaultOutput
    );

    expect(policies.length).toBe(0);
    expect(packages.length).toBe(0);
    expect(nonFatalErrors.length).toBe(0);
  });

  it('should install packages successfully', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const { policies, packages, nonFatalErrors } = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      [],
      [{ name: 'test_package', version: '3.0.0' }],
      mockDefaultOutput
    );

    expect(policies.length).toBe(0);
    expect(packages).toEqual(expect.arrayContaining(['test_package-3.0.0']));
    expect(nonFatalErrors.length).toBe(0);
  });

  it('should install packages and configure agent policies successfully', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const { policies, packages, nonFatalErrors } = await ensurePreconfiguredPackagesAndPolicies(
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
    expect(nonFatalErrors.length).toBe(0);
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

  it('should not create a policy if we are not able to add packages ', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const policies: PreconfiguredAgentPolicy[] = [
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
    ];

    let error;
    try {
      await ensurePreconfiguredPackagesAndPolicies(
        soClient,
        esClient,
        policies,
        [{ name: 'CANNOT_MATCH', version: 'x.y.z' }],
        mockDefaultOutput
      );
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.message).toEqual(
      'Test policy could not be added. test_package is not installed, add test_package to `xpack.fleet.packages` or remove it from Test package.'
    );
  });
  it('should not attempt to recreate or modify an agent policy if its ID is unchanged', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const {
      policies: policiesA,
      nonFatalErrors: nonFatalErrorsA,
    } = await ensurePreconfiguredPackagesAndPolicies(
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
    expect(nonFatalErrorsA.length).toBe(0);

    const {
      policies: policiesB,
      nonFatalErrors: nonFatalErrorsB,
    } = await ensurePreconfiguredPackagesAndPolicies(
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
    expect(nonFatalErrorsB.length).toBe(0);
  });

  it('should update a managed policy if top level fields are changed', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    mockConfiguredPolicies.set('test-id', {
      name: 'Test policy',
      description: 'Test policy description',
      unenroll_timeout: 120,
      namespace: 'default',
      id: 'test-id',
      package_policies: [],
      is_managed: true,
    } as PreconfiguredAgentPolicy);

    const {
      policies,
      nonFatalErrors: nonFatalErrorsB,
    } = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      [
        {
          name: 'Renamed Test policy',
          description: 'Renamed Test policy description',
          unenroll_timeout: 999,
          namespace: 'default',
          id: 'test-id',
          is_managed: true,
          package_policies: [],
        },
      ] as PreconfiguredAgentPolicy[],
      [],
      mockDefaultOutput
    );
    expect(spyAgentPolicyServiceUpdate).toBeCalled();
    expect(spyAgentPolicyServiceUpdate).toBeCalledWith(
      expect.anything(), // soClient
      expect.anything(), // esClient
      'test-id',
      expect.objectContaining({
        name: 'Renamed Test policy',
        description: 'Renamed Test policy description',
        unenroll_timeout: 999,
      })
    );
    expect(policies.length).toEqual(1);
    expect(policies[0].id).toBe('test-id');
    expect(nonFatalErrorsB.length).toBe(0);
  });

  it('should not update a managed policy if a top level field has not changed', async () => {
    const soClient = getPutPreconfiguredPackagesMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const policy: PreconfiguredAgentPolicy = {
      name: 'Test policy',
      namespace: 'default',
      id: 'test-id',
      package_policies: [],
      is_managed: true,
    };
    mockConfiguredPolicies.set('test-id', policy);

    const {
      policies,
      nonFatalErrors: nonFatalErrorsB,
    } = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      [policy],
      [],
      mockDefaultOutput
    );
    expect(spyAgentPolicyServiceUpdate).not.toBeCalled();
    expect(policies.length).toEqual(1);
    expect(policies[0].id).toBe('test-id');
    expect(nonFatalErrorsB.length).toBe(0);
  });
});

describe('comparePreconfiguredPolicyToCurrent', () => {
  const baseConfig = {
    name: 'Test policy',
    namespace: 'default',
    description: 'This is a test policy',
    id: 'test-id',
    unenroll_timeout: 60,
    package_policies: [
      {
        package: { name: 'test_package' },
        name: 'Test package',
      },
    ],
  };

  const basePackagePolicy: AgentPolicy = {
    id: 'test-id',
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics'],
    name: 'Test policy',
    description: 'This is a test policy',
    unenroll_timeout: 60,
    is_preconfigured: true,
    status: 'active',
    is_managed: true,
    revision: 1,
    updated_at: '2021-07-07T16:29:55.144Z',
    updated_by: 'system',
    package_policies: [
      {
        package: { name: 'test_package', title: 'Test package', version: '1.0.0' },
        name: 'Test package',
        namespace: 'default',
        enabled: true,
        id: 'test-package-id',
        revision: 1,
        updated_at: '2021-07-07T16:29:55.144Z',
        updated_by: 'system',
        created_at: '2021-07-07T16:29:55.144Z',
        created_by: 'system',
        inputs: [],
        policy_id: 'abc123',
        output_id: 'default',
      },
    ],
  };

  it('should return hasChanged when a top-level policy field changes', () => {
    const { hasChanged } = comparePreconfiguredPolicyToCurrent(
      { ...baseConfig, unenroll_timeout: 120 },
      basePackagePolicy
    );
    expect(hasChanged).toBe(true);
  });

  it('should not return hasChanged when no top-level fields change', () => {
    const { hasChanged } = comparePreconfiguredPolicyToCurrent(
      {
        ...baseConfig,
        package_policies: [
          {
            package: { name: 'different_package' },
            name: 'Different package',
          },
        ],
      },
      basePackagePolicy
    );
    expect(hasChanged).toBe(false);
  });
});
