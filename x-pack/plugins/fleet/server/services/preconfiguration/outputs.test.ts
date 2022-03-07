/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import type { InstallResult, PreconfiguredOutput } from '../../../common/types';
import type { NewPackagePolicy, Output } from '../../types';

import * as agentPolicy from '../agent_policy';
import { outputService } from '../output';
import type { InstallPackageParams } from '../epm/packages/install';

import { createOrUpdatePreconfiguredOutputs, cleanPreconfiguredOutputs } from './outputs';

jest.mock('../agent_policy_update');
jest.mock('../output');
jest.mock('../epm/packages/bundled_packages');
jest.mock('../epm/archive');

const mockedOutputService = outputService as jest.Mocked<typeof outputService>;

const mockInstalledPackages = new Map();
const mockInstallPackageErrors = new Map<string, string>();

jest.mock('./epm/packages/install', () => ({
  async installPackage(args: InstallPackageParams): Promise<InstallResult | undefined> {
    if (args.installSource === 'registry') {
      const [pkgName, pkgVersion] = args.pkgkey.split('-');
      const installError = mockInstallPackageErrors.get(pkgName);
      if (installError) {
        return {
          error: new Error(installError),
          installType: 'install',
          installSource: 'registry',
        };
      }

      const installedPackage = mockInstalledPackages.get(pkgName);
      if (installedPackage) {
        if (installedPackage.version === pkgVersion) return installedPackage;
      }

      const packageInstallation = { name: pkgName, version: pkgVersion, title: pkgName };
      mockInstalledPackages.set(pkgName, packageInstallation);

      return {
        status: 'installed',
        installType: 'install',
        installSource: 'registry',
      };
    } else if (args.installSource === 'upload') {
      const { archiveBuffer } = args;

      // Treat the buffer value passed in tests as the package's name for simplicity
      const pkgName = archiveBuffer.toString('utf8');

      // Just install every bundled package at version '1.0.0'
      const packageInstallation = { name: pkgName, version: '1.0.0', title: pkgName };
      mockInstalledPackages.set(pkgName, packageInstallation);

      return { status: 'installed', installType: 'install', installSource: 'upload' };
    }
  },
  ensurePackagesCompletedInstall() {
    return [];
  },
  isPackageVersionOrLaterInstalled({
    soClient,
    pkgName,
    pkgVersion,
  }: {
    soClient: any;
    pkgName: string;
    pkgVersion: string;
  }) {
    const installedPackage = mockInstalledPackages.get(pkgName);

    if (installedPackage) {
      if (installedPackage.version === pkgVersion) {
        return { package: installedPackage, installType: 'reinstall' };
      }

      // Importing semver methods throws an error in jest, so just use a rough check instead
      if (installedPackage.version < pkgVersion) {
        return false;
      }
      if (installedPackage.version > pkgVersion) {
        return { package: installedPackage, installType: 'rollback' };
      }
    }

    return false;
  },
  getInstallType: jest.fn(),
  async updateInstallStatus(soClient: any, pkgName: string, status: string) {
    const installedPackage = mockInstalledPackages.get(pkgName);

    if (!installedPackage) {
      return;
    }

    installedPackage.install_status = status;
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
  getInstallationObject({ pkgName }: { pkgName: string }) {
    return mockInstalledPackages.get(pkgName) ?? false;
  },
}));

jest.mock('./epm/kibana/index_pattern/install');

jest.mock('./package_policy', () => ({
  ...jest.requireActual('./package_policy'),
  packagePolicyService: {
    getByIDs: jest.fn().mockReturnValue([]),
    listIds: jest.fn().mockReturnValue({ items: [] }),
    create: jest
      .fn()
      .mockImplementation((soClient: any, esClient: any, newPackagePolicy: NewPackagePolicy) => {
        return {
          id: 'mocked',
          version: 'mocked',
          ...newPackagePolicy,
        };
      }),
    get(soClient: any, id: string) {
      return {
        id: 'mocked',
        version: 'mocked',
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

const spyAgentPolicyServicBumpAllAgentPoliciesForOutput = jest.spyOn(
  agentPolicy.agentPolicyService,
  'bumpAllAgentPoliciesForOutput'
);

describe('output preconfiguration', () => {
  beforeEach(() => {
    mockedOutputService.create.mockReset();
    mockedOutputService.update.mockReset();
    mockedOutputService.delete.mockReset();
    mockedOutputService.getDefaultDataOutputId.mockReset();
    mockedOutputService.getDefaultESHosts.mockReturnValue(['http://default-es:9200']);
    mockedOutputService.bulkGet.mockImplementation(async (soClient, id): Promise<Output[]> => {
      return [
        {
          id: 'existing-output-1',
          is_default: false,
          is_default_monitoring: false,
          name: 'Output 1',
          // @ts-ignore
          type: 'elasticsearch',
          hosts: ['http://es.co:80'],
          is_preconfigured: true,
        },
      ];
    });
  });

  it('should create preconfigured output that does not exists', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await createOrUpdatePreconfiguredOutputs(soClient, esClient, [
      {
        id: 'non-existing-output-1',
        name: 'Output 1',
        type: 'elasticsearch',
        is_default: false,
        is_default_monitoring: false,
        hosts: ['http://test.fr'],
      },
    ]);

    expect(mockedOutputService.create).toBeCalled();
    expect(mockedOutputService.update).not.toBeCalled();
    expect(spyAgentPolicyServicBumpAllAgentPoliciesForOutput).not.toBeCalled();
  });

  it('should set default hosts if hosts is not set output that does not exists', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await createOrUpdatePreconfiguredOutputs(soClient, esClient, [
      {
        id: 'non-existing-output-1',
        name: 'Output 1',
        type: 'elasticsearch',
        is_default: false,
        is_default_monitoring: false,
      },
    ]);

    expect(mockedOutputService.create).toBeCalled();
    expect(mockedOutputService.create.mock.calls[0][1].hosts).toEqual(['http://default-es:9200']);
  });

  it('should update output if preconfigured output exists and changed', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient.find.mockResolvedValue({ saved_objects: [], page: 0, per_page: 0, total: 0 });
    await createOrUpdatePreconfiguredOutputs(soClient, esClient, [
      {
        id: 'existing-output-1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://newhostichanged.co:9201'], // field that changed
      },
    ]);

    expect(mockedOutputService.create).not.toBeCalled();
    expect(mockedOutputService.update).toBeCalled();
    expect(spyAgentPolicyServicBumpAllAgentPoliciesForOutput).toBeCalled();
  });

  it('should not delete default output if preconfigured default output exists and changed', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient.find.mockResolvedValue({ saved_objects: [], page: 0, per_page: 0, total: 0 });
    mockedOutputService.getDefaultDataOutputId.mockResolvedValue('existing-output-1');
    await createOrUpdatePreconfiguredOutputs(soClient, esClient, [
      {
        id: 'existing-output-1',
        is_default: true,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://newhostichanged.co:9201'], // field that changed
      },
    ]);

    expect(mockedOutputService.delete).not.toBeCalled();
    expect(mockedOutputService.create).not.toBeCalled();
    expect(mockedOutputService.update).toBeCalled();
    expect(spyAgentPolicyServicBumpAllAgentPoliciesForOutput).toBeCalled();
  });

  const SCENARIOS: Array<{ name: string; data: PreconfiguredOutput }> = [
    {
      name: 'no changes',
      data: {
        id: 'existing-output-1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://es.co:80'],
      },
    },
    {
      name: 'hosts without port',
      data: {
        id: 'existing-output-1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://es.co'],
      },
    },
  ];
  SCENARIOS.forEach((scenario) => {
    const { data, name } = scenario;
    it(`should do nothing if preconfigured output exists and did not changed (${name})`, async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      await createOrUpdatePreconfiguredOutputs(soClient, esClient, [data]);

      expect(mockedOutputService.create).not.toBeCalled();
      expect(mockedOutputService.update).not.toBeCalled();
    });
  });

  it('should not delete non deleted preconfigured output', async () => {
    const soClient = savedObjectsClientMock.create();
    mockedOutputService.list.mockResolvedValue({
      items: [
        { id: 'output1', is_preconfigured: true } as Output,
        { id: 'output2', is_preconfigured: true } as Output,
      ],
      page: 1,
      perPage: 10000,
      total: 1,
    });
    await cleanPreconfiguredOutputs(soClient, [
      {
        id: 'output1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://es.co:9201'],
      },
      {
        id: 'output2',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 2',
        type: 'elasticsearch',
        hosts: ['http://es.co:9201'],
      },
    ]);

    expect(mockedOutputService.delete).not.toBeCalled();
  });

  it('should delete deleted preconfigured output', async () => {
    const soClient = savedObjectsClientMock.create();
    mockedOutputService.list.mockResolvedValue({
      items: [
        { id: 'output1', is_preconfigured: true } as Output,
        { id: 'output2', is_preconfigured: true } as Output,
      ],
      page: 1,
      perPage: 10000,
      total: 1,
    });
    await cleanPreconfiguredOutputs(soClient, [
      {
        id: 'output1',
        is_default: false,
        is_default_monitoring: false,
        name: 'Output 1',
        type: 'elasticsearch',
        hosts: ['http://es.co:9201'],
      },
    ]);

    expect(mockedOutputService.delete).toBeCalled();
    expect(mockedOutputService.delete).toBeCalledTimes(1);
    expect(mockedOutputService.delete.mock.calls[0][1]).toEqual('output2');
  });
});
