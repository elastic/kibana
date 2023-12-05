/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { appContextService } from '../../app_context';

import {
  getBundledPackageByPkgKey,
  getBundledPackages,
  _purgeBundledPackagesCache,
} from './bundled_packages';

jest.mock('fs/promises');
jest.mock('../../app_context');

describe('bundledPackages', () => {
  beforeAll(() => {
    jest.mocked(appContextService.getConfig).mockReturnValue({
      developer: {
        bundledPackageLocation: '/tmp/test',
      },
    } as any);
    jest.mocked(appContextService.getLogger).mockReturnValue(loggingSystemMock.createLogger());
  });
  beforeEach(() => {
    _purgeBundledPackagesCache();
    jest.mocked(fs.stat).mockResolvedValue({} as any);
    jest
      .mocked(fs.readdir)
      .mockReset()
      .mockResolvedValue(['apm-8.8.0.zip', 'test-1.0.0.zip'] as any);

    jest.mocked(fs.readFile).mockReset().mockResolvedValue(Buffer.from('TEST'));
  });

  afterEach(() => {
    jest.mocked(fs.stat).mockReset();
  });
  describe('getBundledPackages', () => {
    it('return an empty array if dir do not exists', async () => {
      jest.mocked(fs.stat).mockRejectedValue(new Error('NOTEXISTS'));
      const packages = await getBundledPackages();
      expect(packages).toEqual([]);
    });

    it('return packages in bundled directory', async () => {
      const packages = await getBundledPackages();
      expect(packages).toEqual([
        {
          name: 'apm',
          version: '8.8.0',
          buffer: Buffer.from('TEST'),
        },
        {
          name: 'test',
          version: '1.0.0',
          buffer: Buffer.from('TEST'),
        },
      ]);
    });

    it('should use cache if called multiple time', async () => {
      const packagesRes1 = await getBundledPackages();
      const packagesRes2 = await getBundledPackages();
      expect(packagesRes1).toEqual(packagesRes2);
      expect(fs.readdir).toBeCalledTimes(1);
    });
  });
  describe('getBundledPackageByPkgKey', () => {
    it('should return package by name if no version is provided', async () => {
      const pkg = await getBundledPackageByPkgKey('apm');

      expect(pkg).toBeDefined();
      expect(pkg).toEqual({
        name: 'apm',
        version: '8.8.0',
        buffer: Buffer.from('TEST'),
      });
    });

    it('should return package by name and version if version is provided', async () => {
      const pkg = await getBundledPackageByPkgKey('apm-8.8.0');

      expect(pkg).toBeDefined();
      expect(pkg).toEqual({
        name: 'apm',
        version: '8.8.0',
        buffer: Buffer.from('TEST'),
      });
    });

    it('should return package by name and version if version is provided and do not exists', async () => {
      const pkg = await getBundledPackageByPkgKey('apm-8.0.0');

      expect(pkg).not.toBeDefined();
    });
  });
});
