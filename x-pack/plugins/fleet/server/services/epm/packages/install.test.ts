/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';
import type { ElasticsearchClient, SavedObject } from '@kbn/core/server';

import type { InstallablePackage, Installation } from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../common';

import { sendTelemetryEvents } from '../../upgrade_sender';
import { licenseService } from '../../license';
import { auditLoggingService } from '../../audit_logging';
import { appContextService } from '../../app_context';
import { ConcurrentInstallOperationError, FleetError } from '../../../errors';

import * as Registry from '../registry';

import { createInstallation, handleInstallPackageFailure, installPackage } from './install';
import * as install from './_install_package';
import { getBundledPackageByPkgKey } from './bundled_packages';

import * as obj from '.';

jest.mock('../../app_context', () => {
  const logger = { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() };
  return {
    appContextService: {
      getLogger: jest.fn(() => {
        return logger;
      }),
      getTelemetryEventsSender: jest.fn(),
      getSavedObjects: jest.fn(() => ({
        createImporter: jest.fn(),
      })),
      getConfig: jest.fn(() => ({})),
      getSavedObjectsTagging: jest.fn(() => ({
        createInternalAssignmentService: jest.fn(),
        createTagClient: jest.fn(),
      })),
    },
  };
});
jest.mock('.');
jest.mock('../registry', () => {
  return {
    ...jest.requireActual('../registry'),
    fetchFindLatestPackageOrThrow: jest.fn(),
    getPackage: jest.fn(),
  };
});
jest.mock('../../upgrade_sender');
jest.mock('../../license');
jest.mock('../../upgrade_sender');
jest.mock('./cleanup');
jest.mock('./bundled_packages');
jest.mock('./_install_package', () => {
  return {
    _installPackage: jest.fn(() => Promise.resolve()),
  };
});
jest.mock('../kibana/index_pattern/install', () => {
  return {
    installIndexPatterns: jest.fn(() => Promise.resolve()),
  };
});
jest.mock('../archive', () => {
  return {
    generatePackageInfoFromArchiveBuffer: jest.fn(() =>
      Promise.resolve({ packageInfo: { name: 'apache', version: '1.3.0' } })
    ),
    unpackBufferToCache: jest.fn(),
    setPackageInfo: jest.fn(),
    deleteVerificationResult: jest.fn(),
  };
});
jest.mock('../../audit_logging');

const mockGetBundledPackageByPkgKey = jest.mocked(getBundledPackageByPkgKey);
const mockedAuditLoggingService = jest.mocked(auditLoggingService);

describe('createInstallation', () => {
  const soClient = savedObjectsClientMock.create();

  const packageInfo: InstallablePackage = {
    name: 'test-package',
    version: '1.0.0',
    format_version: '1.0.0',
    title: 'Test Package',
    description: 'A package for testing',
    owner: {
      github: 'elastic',
    },
  };

  describe('installSource: registry', () => {
    it('should call audit logger', async () => {
      await createInstallation({
        savedObjectsClient: soClient,
        packageInfo,
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'create',
        id: 'test-package',
        savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('installSource: upload', () => {
    it('should call audit logger', async () => {
      await createInstallation({
        savedObjectsClient: soClient,
        packageInfo,
        installSource: 'upload',
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'create',
        id: 'test-package',
        savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
      });
    });
  });
});

describe('install', () => {
  beforeEach(() => {
    jest
      .mocked(Registry.fetchFindLatestPackageOrThrow)
      .mockImplementation(() => Promise.resolve({ version: '1.3.0' } as any));
    jest.mocked(Registry.getPackage).mockImplementation(() =>
      Promise.resolve({
        packageInfo: { license: 'basic', conditions: { elastic: { subscription: 'basic' } } },
      } as any)
    );

    mockGetBundledPackageByPkgKey.mockReset();
    (install._installPackage as jest.Mock).mockClear();
  });

  describe('registry', () => {
    beforeEach(() => {
      mockGetBundledPackageByPkgKey.mockResolvedValue(undefined);
    });

    it('should send telemetry on install failure, out of date', async () => {
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.1.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        errorMessage: 'apache-1.1.0 is out-of-date and cannot be installed or updated',
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.1.0',
        packageName: 'apache',
        status: 'failure',
      });
    });

    it('should send telemetry on install failure, license error', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(false);
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.3.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        errorMessage: 'Installation requires basic license',
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'failure',
      });
    });

    it('should send telemetry on install success', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.3.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'success',
      });
    });

    it('should send telemetry on update success', async () => {
      jest
        .spyOn(obj, 'getInstallationObject')
        .mockImplementationOnce(() => Promise.resolve({ attributes: { version: '1.2.0' } } as any));
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.3.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: '1.2.0',
        dryRun: false,
        eventType: 'package-install',
        installType: 'update',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'success',
      });
    });

    it('should send telemetry on install failure, async error', async () => {
      jest.mocked(install._installPackage).mockRejectedValue(new Error('error'));
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);

      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.3.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        errorMessage: 'error',
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'failure',
      });
    });

    it('should install from bundled package if one exists', async () => {
      (install._installPackage as jest.Mock).mockResolvedValue({});
      mockGetBundledPackageByPkgKey.mockResolvedValue({
        name: 'test_package',
        version: '1.0.0',
        getBuffer: async () => Buffer.from('test_package'),
      });

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'test_package-1.0.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.error).toBeUndefined();

      expect(install._installPackage).toHaveBeenCalledWith(
        expect.objectContaining({ installSource: 'bundled' })
      );
    });

    it('should fetch latest version if version not provided', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'test_package',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.status).toEqual('installed');

      expect(sendTelemetryEvents).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.objectContaining({
          newVersion: '1.3.0',
        })
      );
    });

    it('should do nothing if same version is installed', async () => {
      jest.spyOn(obj, 'getInstallationObject').mockImplementationOnce(() =>
        Promise.resolve({
          attributes: {
            version: '1.2.0',
            install_status: 'installed',
            installed_es: [],
            installed_kibana: [],
          },
        } as any)
      );
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.2.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.status).toEqual('already_installed');
    });

    it('should allow to install fleet_server if internal.fleetServerStandalone is configured', async () => {
      jest.mocked(appContextService.getConfig).mockReturnValueOnce({
        internal: {
          fleetServerStandalone: true,
        },
      } as any);

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'fleet_server-2.0.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.status).toEqual('installed');
    });
  });

  describe('upload', () => {
    it('should send telemetry on update', async () => {
      jest
        .spyOn(obj, 'getInstallationObject')
        .mockImplementationOnce(() => Promise.resolve({ attributes: { version: '1.2.0' } } as any));
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: '1.2.0',
        dryRun: false,
        eventType: 'package-install',
        installType: 'update',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'success',
      });
    });

    it('should send telemetry on install success', async () => {
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'success',
      });
    });

    it('should send telemetry on install failure, async error', async () => {
      jest.mocked(install._installPackage).mockRejectedValue(new Error('error'));
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        errorMessage: 'error',
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'failure',
      });
    });
  });
});
describe('handleInstallPackageFailure', () => {
  const mockedLogger = jest.mocked(appContextService.getLogger());
  beforeEach(() => {
    jest.mocked(install._installPackage).mockClear();
    jest.mocked(install._installPackage).mockResolvedValue({} as any);
    mockedLogger.error.mockClear();
    mockGetBundledPackageByPkgKey.mockResolvedValue(undefined);
    jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
    jest.spyOn(Registry, 'splitPkgKey').mockImplementation((pkgKey: string) => {
      const [pkgName, pkgVersion] = pkgKey.split('-');
      return { pkgName, pkgVersion };
    });
    jest
      .spyOn(Registry, 'pkgToPkgKey')
      .mockImplementation((pkg: { name: string; version: string }) => {
        return `${pkg.name}-${pkg.version}`;
      });
    jest
      .spyOn(Registry, 'fetchFindLatestPackageOrThrow')
      .mockImplementation(() => Promise.resolve({ version: '2.0.0' } as any));
    jest.spyOn(Registry, 'getPackage').mockImplementation((pkgName: string, pkgVersion: string) =>
      Promise.resolve({
        packageInfo: { name: pkgName, version: pkgVersion },
      } as any)
    );
  });
  const pkgName = 'test_package';

  it('should do nothing if error is ', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();

    const installedPkg: SavedObject<Installation> = {
      id: 'test-package',
      references: [],
      attributes: {
        name: pkgName,
        version: '1.0.0',
        install_version: '1.0.0',
        format_version: '1.0.0',
        title: 'Test Package',
        description: 'A package for testing',
        owner: {
          github: 'elastic',
        },
      },
    } as any;
    await handleInstallPackageFailure({
      savedObjectsClient,
      error: new ConcurrentInstallOperationError('test 123'),
      esClient: {} as ElasticsearchClient,
      installedPkg,
      pkgName,
      pkgVersion: '2.0.0',
      spaceId: 'default',
    });

    expect(mockedLogger.error).not.toBeCalled();
    expect(install._installPackage).not.toBeCalled();
  });

  it('Should rollback on upgrade on FleetError', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();

    const installedPkg: SavedObject<Installation> = {
      id: 'test-package',
      references: [],
      attributes: {
        name: pkgName,
        version: '1.0.0',
        install_version: '1.0.0',
        format_version: '1.0.0',
        title: 'Test Package',
        description: 'A package for testing',
        owner: {
          github: 'elastic',
        },
      },
    } as any;
    await handleInstallPackageFailure({
      savedObjectsClient,
      error: new FleetError('test 123'),
      esClient: {} as ElasticsearchClient,
      installedPkg,
      pkgName,
      pkgVersion: '2.0.0',
      spaceId: 'default',
    });

    expect(mockedLogger.error).toBeCalledTimes(1);
    expect(mockedLogger.error).toBeCalledWith(
      'rolling back to test_package-1.0.0 after error installing test_package-2.0.0'
    );
    expect(install._installPackage).toBeCalledTimes(1);
    expect(install._installPackage).toBeCalledWith(
      expect.objectContaining({
        packageInfo: expect.objectContaining({ name: pkgName, version: '1.0.0' }),
      })
    );
  });

  it('Should update the installation status to: install_failed on rollback error', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();

    jest.mocked(install._installPackage).mockRejectedValue(new Error('test error'));

    const installedPkg: SavedObject<Installation> = {
      id: 'test-package',
      references: [],
      attributes: {
        name: pkgName,
        version: '1.0.0',
        install_version: '1.0.0',
        format_version: '1.0.0',
        title: 'Test Package',
        description: 'A package for testing',
        owner: {
          github: 'elastic',
        },
      },
    } as any;
    await handleInstallPackageFailure({
      savedObjectsClient,
      error: new Error('test 123'),
      esClient: {} as ElasticsearchClient,
      installedPkg,
      pkgName,
      pkgVersion: '2.0.0',
      spaceId: 'default',
    });

    expect(mockedLogger.error).toBeCalledWith(
      'rolling back to test_package-1.0.0 after error installing test_package-2.0.0'
    );
    expect(mockedLogger.error).toBeCalledWith(
      expect.stringMatching(/failed to uninstall or rollback package after installation error/)
    );
    expect(install._installPackage).toBeCalledTimes(1);
    expect(install._installPackage).toBeCalledWith(
      expect.objectContaining({
        packageInfo: expect.objectContaining({ name: pkgName, version: '1.0.0' }),
      })
    );
  });
});
