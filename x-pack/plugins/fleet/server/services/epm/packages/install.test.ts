/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';

import type { ElasticsearchClient } from 'kibana/server';

import * as Registry from '../registry';

import { sendTelemetryEvents } from '../../upgrade_sender';

import { licenseService } from '../../license';

import { installPackage } from './install';
import * as install from './_install_package';
import * as obj from './index';

jest.mock('../../app_context', () => {
  return {
    appContextService: {
      getLogger: jest.fn(() => {
        return { error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
      }),
      getTelemetryEventsSender: jest.fn(),
    },
  };
});
jest.mock('./index');
jest.mock('../registry');
jest.mock('../../upgrade_sender');
jest.mock('../../license');
jest.mock('../../upgrade_sender');
jest.mock('./cleanup');
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
    parseAndVerifyArchiveEntries: jest.fn(() =>
      Promise.resolve({ packageInfo: { name: 'apache', version: '1.3.0' } })
    ),
    unpackBufferToCache: jest.fn(),
    setPackageInfo: jest.fn(),
  };
});

describe('install', () => {
  beforeEach(() => {
    jest.spyOn(Registry, 'splitPkgKey').mockImplementation((pkgKey: string) => {
      const [pkgName, pkgVersion] = pkgKey.split('-');
      return { pkgName, pkgVersion };
    });
    jest
      .spyOn(Registry, 'fetchFindLatestPackage')
      .mockImplementation(() => Promise.resolve({ version: '1.3.0' } as any));
    jest
      .spyOn(Registry, 'getRegistryPackage')
      .mockImplementation(() => Promise.resolve({ packageInfo: { license: 'basic' } } as any));
  });

  describe('registry', () => {
    it('should send telemetry on install failure, out of date', async () => {
      await installPackage({
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
        installSource: 'registry',
        pkgkey: 'apache-1.3.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        errorMessage: 'Requires basic license',
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
      jest
        .spyOn(install, '_installPackage')
        .mockImplementation(() => Promise.reject(new Error('error')));
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await installPackage({
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
  });

  describe('upload', () => {
    it('should send telemetry on install failure', async () => {
      jest
        .spyOn(obj, 'getInstallationObject')
        .mockImplementationOnce(() => Promise.resolve({ attributes: { version: '1.2.0' } } as any));
      await installPackage({
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: '1.2.0',
        dryRun: false,
        errorMessage:
          'Package upload only supports fresh installations. Package apache is already installed, please uninstall first.',
        eventType: 'package-install',
        installType: 'update',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'failure',
      });
    });

    it('should send telemetry on install success', async () => {
      await installPackage({
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
      jest
        .spyOn(install, '_installPackage')
        .mockImplementation(() => Promise.reject(new Error('error')));
      await installPackage({
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
