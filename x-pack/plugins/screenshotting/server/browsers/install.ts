/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import del from 'del';
import os from 'os';
import path from 'path';
import type { Logger } from 'src/core/server';
import { ChromiumArchivePaths } from './chromium';
import { download } from './download';
import { md5 } from './download/checksum';
import { extract } from './extract';

/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 */
export async function install(
  paths: ChromiumArchivePaths,
  logger: Logger,
  chromiumPath: string = path.resolve(__dirname, '../../chromium'),
  platform: string = process.platform,
  architecture: string = os.arch()
): Promise<string> {
  const pkg = paths.find(platform, architecture);

  if (!pkg) {
    throw new Error(`Unsupported platform: ${platform}-${architecture}`);
  }

  const binaryPath = paths.getBinaryPath(pkg);
  const binaryChecksum = await md5(binaryPath).catch(() => '');

  if (binaryChecksum !== pkg.binaryChecksum) {
    logger?.warn(
      `Found browser binary checksum for ${pkg.platform}/${pkg.architecture} ` +
        `is ${binaryChecksum} but ${pkg.binaryChecksum} was expected. Re-installing...`
    );
    try {
      await del(chromiumPath);
    } catch (error) {
      logger.error(error);
    }

    try {
      await download(paths, logger);
      const archive = path.join(paths.archivesPath, pkg.architecture, pkg.archiveFilename);
      logger.info(`Extracting [${archive}] to [${chromiumPath}]`);
      await extract(archive, chromiumPath);
    } catch (error) {
      logger.error(error);
    }
  }

  logger.info(`Browser executable: ${binaryPath}`);

  return binaryPath;
}
