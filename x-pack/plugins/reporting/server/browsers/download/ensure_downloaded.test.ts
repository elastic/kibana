/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import mockFs from 'mock-fs';
import { existsSync, readdirSync } from 'fs';
import { chromium } from '../chromium';
import { download } from './download';
import { md5 } from './checksum';
import { ensureBrowserDownloaded } from './ensure_downloaded';
import { LevelLogger } from '../../lib';

jest.mock('./checksum');
jest.mock('./download');

describe('ensureBrowserDownloaded', () => {
  let logger: jest.Mocked<LevelLogger>;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    } as unknown as typeof logger;

    (md5 as jest.MockedFunction<typeof md5>).mockImplementation(
      async (packagePath) =>
        chromium.paths.packages.find(
          (packageInfo) => chromium.paths.resolvePath(packageInfo) === packagePath
        )?.archiveChecksum ?? 'some-md5'
    );

    (download as jest.MockedFunction<typeof download>).mockImplementation(
      async (_url, packagePath) =>
        chromium.paths.packages.find(
          (packageInfo) => chromium.paths.resolvePath(packageInfo) === packagePath
        )?.archiveChecksum ?? 'some-md5'
    );

    mockFs();
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  it('should remove unexpected files', async () => {
    const unexpectedPath1 = `${chromium.paths.archivesPath}/unexpected1`;
    const unexpectedPath2 = `${chromium.paths.archivesPath}/unexpected2`;

    mockFs({
      [unexpectedPath1]: 'test',
      [unexpectedPath2]: 'test',
    });

    await ensureBrowserDownloaded(logger);

    expect(existsSync(unexpectedPath1)).toBe(false);
    expect(existsSync(unexpectedPath2)).toBe(false);
  });

  it('should reject when download fails', async () => {
    (download as jest.MockedFunction<typeof download>).mockRejectedValueOnce(
      new Error('some error')
    );

    await expect(ensureBrowserDownloaded(logger)).rejects.toBeInstanceOf(Error);
  });

  it('should reject when downloaded md5 hash is different', async () => {
    (download as jest.MockedFunction<typeof download>).mockResolvedValue('random-md5');

    await expect(ensureBrowserDownloaded(logger)).rejects.toBeInstanceOf(Error);
  });

  describe('when archives are already present', () => {
    beforeEach(() => {
      mockFs(
        Object.fromEntries(
          chromium.paths.packages.map((packageInfo) => [
            chromium.paths.resolvePath(packageInfo),
            '',
          ])
        )
      );
    });

    it('should not download again', async () => {
      await ensureBrowserDownloaded(logger);

      expect(download).not.toHaveBeenCalled();
      const paths = [
        readdirSync(path.resolve(chromium.paths.archivesPath + '/x64')),
        readdirSync(path.resolve(chromium.paths.archivesPath + '/arm64')),
      ];

      expect(paths).toEqual([
        expect.arrayContaining([
          'chrome-win.zip',
          'chromium-70f5d88-linux_x64.zip',
          'chromium-d163fd7-darwin_x64.zip',
        ]),
        expect.arrayContaining(['chromium-70f5d88-linux_arm64.zip']),
      ]);
    });

    it('should download again if md5 hash different', async () => {
      (md5 as jest.MockedFunction<typeof md5>).mockResolvedValueOnce('random-md5');
      await ensureBrowserDownloaded(logger);

      expect(download).toHaveBeenCalledTimes(1);
    });
  });
});
