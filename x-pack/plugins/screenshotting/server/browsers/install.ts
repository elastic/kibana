/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import del from 'del';
import path from 'path';
import type { Logger } from '@kbn/core/server';
import { ChromiumArchivePaths, PackageInfo } from './chromium';
import { download } from './download';
import { md5 } from './download/checksum';
import { extract } from './extract';

type ValidChecksum = string;

/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 */
export async function install(
  paths: ChromiumArchivePaths,
  logger: Logger,
  pkg: PackageInfo,
  chromiumPath: string = path.resolve(__dirname, '../../chromium')
): Promise<ValidChecksum | undefined> {
  let installedChecksum: ValidChecksum | undefined;

  const { architecture, platform } = pkg;
  const binaryPath = paths.getBinaryPath(pkg, chromiumPath);
  const foundBinaryChecksum = await md5(binaryPath).catch(() => 'MISSING');

  if (foundBinaryChecksum === pkg.binaryChecksum) {
    installedChecksum = foundBinaryChecksum;
  } else {
    logger?.warn(
      `Found browser binary checksum for ${platform}/${architecture} in ${binaryPath}` +
        ` is ${foundBinaryChecksum} but ${pkg.binaryChecksum} was expected. Re-installing...`
    );
    try {
      await del(chromiumPath);
    } catch (error) {
      logger.error(error);
    }

    try {
      await download(paths, pkg, logger);
      const archive = path.join(paths.archivesPath, architecture, pkg.archiveFilename);
      logger.info(`Extracting [${archive}] to [${chromiumPath}]`);
      await extract(archive, chromiumPath);
    } catch (error) {
      logger.error(error);
    }

    // calculate new checksum
    const downloadedBinaryChecksum = await md5(binaryPath).catch(() => 'MISSING');
    if (downloadedBinaryChecksum === pkg.binaryChecksum) {
      installedChecksum = downloadedBinaryChecksum;
    } else {
      const error = new Error(
        `Error installing browsers, binary checksums incorrect for [${architecture}/${platform}]`
      );
      logger?.error(error);

      throw error;
    }
  }

  logger.info(`Browser executable: ${binaryPath}`);

  return installedChecksum;
}
