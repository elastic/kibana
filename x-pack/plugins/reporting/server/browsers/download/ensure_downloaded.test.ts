/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
      async (path) =>
        chromium.paths.packages.find(
          (packageInfo) => chromium.paths.resolvePath(packageInfo) === path
        )?.archiveChecksum ?? 'some-md5'
    );

    (download as jest.MockedFunction<typeof download>).mockImplementation(
      async (_url, path) =>
        chromium.paths.packages.find(
          (packageInfo) => chromium.paths.resolvePath(packageInfo) === path
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
      expect(readdirSync(chromium.paths.archivesPath)).toEqual(
        expect.arrayContaining(
          chromium.paths.packages.map(({ archiveFilename }) => archiveFilename)
        )
      );
    });

    it('should download again if md5 hash different', async () => {
      (md5 as jest.MockedFunction<typeof md5>).mockResolvedValueOnce('random-md5');
      await ensureBrowserDownloaded(logger);

      expect(download).toHaveBeenCalledTimes(1);
    });
  });
});
