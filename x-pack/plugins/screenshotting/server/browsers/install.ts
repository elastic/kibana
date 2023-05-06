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

type BinaryPath = string;

/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 */
export async function install(
  paths: ChromiumArchivePaths,
  logger: Logger,
  pkg: PackageInfo,
  chromiumPath: string = path.resolve(__dirname, '../../chromium')
): Promise<BinaryPath> {
  const { architecture, platform } = pkg;
  const binaryPath = paths.getBinaryPath(pkg, chromiumPath);
  const binaryChecksum = await md5(binaryPath).catch(() => 'MISSING');

  if (binaryChecksum === pkg.binaryChecksum) {
    logger.info(`Browser executable: ${binaryPath}`);
    // validated a previously downloaded browser
    return binaryPath;
  }

  logger?.warn(
    `Found browser binary checksum for ${platform}/${architecture} in ${binaryPath}` +
      ` is ${binaryChecksum} but ${pkg.binaryChecksum} was expected. Re-installing...`
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

  logger.info(`Browser executable has been installed: ${binaryPath}`);

  return binaryPath;
}
