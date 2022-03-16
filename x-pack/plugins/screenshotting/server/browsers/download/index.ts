/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync } from 'fs';
import del from 'del';
import type { Logger } from 'src/core/server';
import type { ChromiumArchivePaths, PackageInfo } from '../chromium';
import { md5 } from './checksum';
import { fetch } from './fetch';

/**
 * Clears the unexpected files in the browsers archivesPath
 * and ensures that all packages/archives are downloaded and
 * that their checksums match the declared value
 * @param  {BrowserSpec} browsers
 * @return {Promise<undefined>}
 */
export async function download(paths: ChromiumArchivePaths, pkg: PackageInfo, logger?: Logger) {
  const removedFiles = await del(`${paths.archivesPath}/**/*`, {
    force: true,
    onlyFiles: true,
    ignore: paths.getAllArchiveFilenames(),
  });

  removedFiles.forEach((path) => logger?.warn(`Deleting unexpected file ${path}`));

  const invalidChecksums: string[] = [];

  const { archiveFilename, archiveChecksum } = pkg;
  if (!archiveFilename || !archiveChecksum) {
    return;
  }

  const resolvedPath = paths.resolvePath(pkg);
  const foundChecksum = await md5(resolvedPath).catch(() => 'MISSING');

  const pathExists = existsSync(resolvedPath);
  if (pathExists && foundChecksum === archiveChecksum) {
    logger?.debug(
      `Browser archive for ${pkg.platform}/${pkg.architecture} already found in ${resolvedPath}.`
    );
    return;
  }

  if (!pathExists) {
    logger?.warn(
      `Browser archive for ${pkg.platform}/${pkg.architecture} not found in ${resolvedPath}.`
    );
  }

  if (foundChecksum !== archiveChecksum) {
    logger?.warn(
      `Browser archive checksum for ${pkg.platform}/${pkg.architecture} ` +
        `is ${foundChecksum} but ${archiveChecksum} was expected.`
    );
  }

  const url = paths.getDownloadUrl(pkg);
  try {
    const downloadedChecksum = await fetch(url, resolvedPath, logger);
    if (downloadedChecksum !== archiveChecksum) {
      logger?.warn(
        `Invalid checksum for ${pkg.platform}/${pkg.architecture}: ` +
          `expected ${archiveChecksum} got ${downloadedChecksum}`
      );
      invalidChecksums.push(`${url} => ${resolvedPath}`);
    }
  } catch (error) {
    throw new Error(`Failed to download ${url}: ${error}`);
  }

  if (invalidChecksums.length) {
    const error = new Error(
      `Error downloading browsers, checksums incorrect for:\n    - ${invalidChecksums.join(
        '\n    - '
      )}`
    );
    logger?.error(error);

    throw error;
  }
}
