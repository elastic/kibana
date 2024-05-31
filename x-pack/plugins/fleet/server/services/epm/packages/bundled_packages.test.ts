/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';

import { omit } from 'lodash';

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
  beforeEach(() => {
    jest.mocked(appContextService.getConfig).mockReturnValue({
      developer: {
        bundledPackageLocation: '/tmp/test',
      },
    } as any);
    jest.mocked(appContextService.getLogger).mockReturnValue(loggingSystemMock.createLogger());
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
        expect.objectContaining({
          name: 'apm',
          version: '8.8.0',
        }),
        expect.objectContaining({
          name: 'test',
          version: '1.0.0',
        }),
      ]);

      expect(await packages[0]?.getBuffer()).toEqual(Buffer.from('TEST'));
      expect(await packages[1]?.getBuffer()).toEqual(Buffer.from('TEST'));
    });

    it('should use cache if called multiple time', async () => {
      const packagesRes1 = await getBundledPackages();
      const packagesRes2 = await getBundledPackages();
      expect(packagesRes1.map((p) => omit(p, 'getBuffer'))).toEqual(
        packagesRes2.map((p) => omit(p, 'getBuffer'))
      );
      expect(fs.readdir).toBeCalledTimes(1);
    });

    it('should cache getBuffer if called multiple time in the scope of getBundledPackages', async () => {
      const packagesRes1 = await getBundledPackages();

      await packagesRes1[0].getBuffer();
      await packagesRes1[0].getBuffer();
      expect(fs.readFile).toBeCalledTimes(1);
    });

    it('should not use cache if called multiple time and cache is disabled', async () => {
      jest.mocked(appContextService.getConfig).mockReturnValue({
        developer: {
          bundledPackageLocation: '/tmp/test',
          disableBundledPackagesCache: true,
        },
      } as any);
      await getBundledPackages();
      await getBundledPackages();
      expect(fs.readdir).toBeCalledTimes(2);
    });
  });
  describe('getBundledPackageByPkgKey', () => {
    it('should return package by name if no version is provided', async () => {
      const pkg = await getBundledPackageByPkgKey('apm');

      expect(pkg).toBeDefined();
      expect(pkg).toEqual(
        expect.objectContaining({
          name: 'apm',
          version: '8.8.0',
        })
      );

      expect(await pkg?.getBuffer()).toEqual(Buffer.from('TEST'));
    });

    it('should return package by name and version if version is provided', async () => {
      const pkg = await getBundledPackageByPkgKey('apm-8.8.0');

      expect(pkg).toBeDefined();
      expect(pkg).toEqual(
        expect.objectContaining({
          name: 'apm',
          version: '8.8.0',
        })
      );

      expect(await pkg?.getBuffer()).toEqual(Buffer.from('TEST'));
    });

    it('should return package by name and version if version is provided and do not exists', async () => {
      const pkg = await getBundledPackageByPkgKey('apm-8.0.0');

      expect(pkg).not.toBeDefined();
    });
  });
});
