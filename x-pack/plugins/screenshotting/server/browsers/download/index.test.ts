/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import mockFs from 'mock-fs';
import { existsSync, readdirSync } from 'fs';
import { ChromiumArchivePaths, PackageInfo } from '../chromium';
import { fetch } from './fetch';
import { md5 } from './checksum';
import { download } from '.';

jest.mock('./checksum');
jest.mock('./fetch');

describe('ensureDownloaded', () => {
  let paths: ChromiumArchivePaths;
  let pkg: PackageInfo;

  beforeEach(() => {
    paths = new ChromiumArchivePaths();
    pkg = paths.find('linux', 'x64') as PackageInfo;

    (md5 as jest.MockedFunction<typeof md5>).mockImplementation(
      async (packagePath) =>
        paths.packages.find((packageInfo) => paths.resolvePath(packageInfo) === packagePath)
          ?.archiveChecksum ?? 'some-md5'
    );

    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      async (_url, packagePath) =>
        paths.packages.find((packageInfo) => paths.resolvePath(packageInfo) === packagePath)
          ?.archiveChecksum ?? 'some-md5'
    );

    mockFs();
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  it('should remove unexpected files', async () => {
    const unexpectedPath1 = `${paths.archivesPath}/unexpected1`;
    const unexpectedPath2 = `${paths.archivesPath}/unexpected2`;

    mockFs({
      [unexpectedPath1]: 'test',
      [unexpectedPath2]: 'test',
    });

    await download(paths, pkg);

    expect(existsSync(unexpectedPath1)).toBe(false);
    expect(existsSync(unexpectedPath2)).toBe(false);
  });

  it('should reject when download fails', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('some error'));

    await expect(download(paths, pkg)).rejects.toBeInstanceOf(Error);
  });

  it('should reject when downloaded md5 hash is different', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue('random-md5');

    await expect(download(paths, pkg)).rejects.toBeInstanceOf(Error);
  });

  describe('when archives are already present', () => {
    beforeEach(() => {
      mockFs(
        Object.fromEntries(
          paths.packages.map((packageInfo) => [paths.resolvePath(packageInfo), ''])
        )
      );
    });

    it('should not download again', async () => {
      await download(paths, pkg);

      expect(fetch).not.toHaveBeenCalled();
      expect(readdirSync(path.resolve(`${paths.archivesPath}/x64`))).toEqual(
        expect.arrayContaining([
          'chrome-mac.zip',
          'chrome-win.zip',
          'chromium-70f5d88-linux_x64.zip',
        ])
      );
      expect(readdirSync(path.resolve(`${paths.archivesPath}/arm64`))).toEqual(
        expect.arrayContaining(['chrome-mac.zip', 'chromium-70f5d88-linux_arm64.zip'])
      );
    });

    it('should download again if md5 hash different', async () => {
      (md5 as jest.MockedFunction<typeof md5>).mockResolvedValueOnce('random-md5');
      await download(paths, pkg);

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
