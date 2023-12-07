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
import { sha256 } from './checksum';
import { ensureBrowserDownloaded } from './ensure_downloaded';
import { LevelLogger } from '../../lib';

jest.mock('./checksum');
jest.mock('./download');

// https://github.com/elastic/kibana/issues/115881
describe.skip('ensureBrowserDownloaded', () => {
  let logger: jest.Mocked<LevelLogger>;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    } as unknown as typeof logger;

    (sha256 as jest.MockedFunction<typeof sha256>).mockImplementation(
      async (packagePath) =>
        chromium.paths.packages.find(
          (packageInfo) => chromium.paths.resolvePath(packageInfo) === packagePath
        )?.archiveChecksum ?? 'some-sha256'
    );

    (download as jest.MockedFunction<typeof download>).mockImplementation(
      async (_url, packagePath) =>
        chromium.paths.packages.find(
          (packageInfo) => chromium.paths.resolvePath(packageInfo) === packagePath
        )?.archiveChecksum ?? 'some-sha256'
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

  it('should reject when downloaded sha256 hash is different', async () => {
    (download as jest.MockedFunction<typeof download>).mockResolvedValue('random-sha256');

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

    it('should download again if sha256 hash different', async () => {
      (sha256 as jest.MockedFunction<typeof sha256>).mockResolvedValueOnce('random-sha256');
      await ensureBrowserDownloaded(logger);

      expect(download).toHaveBeenCalledTimes(1);
    });
  });
});
