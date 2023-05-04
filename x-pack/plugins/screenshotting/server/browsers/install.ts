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

/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 */
export async function install(
  paths: ChromiumArchivePaths,
  pkg: PackageInfo,
  chromiumPath: string = path.resolve(__dirname, '../../chromium'),
  logger: Logger
): Promise<string> {
  const binaryPath = paths.getBinaryPath(pkg, chromiumPath);

  // NOTE: if binary checksum fails and the archive must be redownloaded,
  // binary checksum verification is is not re-attempted after download and extract
  const binaryChecksum = await md5(binaryPath).catch(() => 'MISSING');

  if (binaryChecksum !== pkg.binaryChecksum) {
    logger?.warn(
      `Found browser binary checksum for ${pkg.platform}/${pkg.architecture} in ${binaryPath}` +
        ` is ${binaryChecksum} but ${pkg.binaryChecksum} was expected. Re-installing...`
    );
    try {
      await del(chromiumPath);
    } catch (error) {
      logger.error(error);
    }

    try {
      await download(paths, pkg, logger);
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
