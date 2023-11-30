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
import { sha1 } from './checksum';
import { download } from '.';

jest.mock('./checksum');
jest.mock('./fetch');

describe('ensureDownloaded', () => {
  let paths: ChromiumArchivePaths;
  let pkg: PackageInfo;

  beforeEach(() => {
    paths = new ChromiumArchivePaths();
    pkg = paths.find('linux', 'x64') as PackageInfo;

    (sha1 as jest.MockedFunction<typeof sha1>).mockImplementation(
      async (packagePath) =>
        paths.packages.find((packageInfo) => paths.resolvePath(packageInfo) === packagePath)
          ?.archiveChecksum ?? 'some-sha1'
    );

    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      async (_url, packagePath) =>
        paths.packages.find((packageInfo) => paths.resolvePath(packageInfo) === packagePath)
          ?.archiveChecksum ?? 'some-sha1'
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

  it('should reject when downloaded sha1 hash is different', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue('random-sha1');

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
          expect.stringMatching(/^chromium-[0-9a-f]{7}-locales-linux_x64\.zip$/),
        ])
      );
      expect(readdirSync(path.resolve(`${paths.archivesPath}/arm64`))).toEqual(
        expect.arrayContaining([
          'chrome-mac.zip',
          expect.stringMatching(/^chromium-[0-9a-f]{7}-locales-linux_arm64\.zip$/),
        ])
      );
    });

    it('should download again if sha1 hash different', async () => {
      (sha1 as jest.MockedFunction<typeof sha1>).mockResolvedValueOnce('random-sha1');
      await download(paths, pkg);

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
