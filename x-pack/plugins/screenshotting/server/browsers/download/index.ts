/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync } from 'fs';
import del from 'del';
import type { Logger } from 'src/core/server';
import type { ChromiumArchivePaths } from '../chromium';
import { md5 } from './checksum';
import { fetch } from './fetch';

/**
 * Clears the unexpected files in the browsers archivesPath
 * and ensures that all packages/archives are downloaded and
 * that their checksums match the declared value
 * @param  {BrowserSpec} browsers
 * @return {Promise<undefined>}
 */
export async function download(paths: ChromiumArchivePaths, logger?: Logger) {
  const removedFiles = await del(`${paths.archivesPath}/**/*`, {
    force: true,
    onlyFiles: true,
    ignore: paths.getAllArchiveFilenames(),
  });

  removedFiles.forEach((path) => logger?.warn(`Deleting unexpected file ${path}`));

  const invalidChecksums: string[] = [];
  await Promise.all(
    paths.packages.map(async (path) => {
      const { archiveFilename, archiveChecksum } = path;
      if (!archiveFilename || !archiveChecksum) {
        return;
      }

      const resolvedPath = paths.resolvePath(path);
      const pathExists = existsSync(resolvedPath);

      let foundChecksum = 'MISSING';
      try {
        foundChecksum = await md5(resolvedPath);
        // eslint-disable-next-line no-empty
      } catch {}

      if (pathExists && foundChecksum === archiveChecksum) {
        logger?.debug(
          `Browser archive for ${path.platform}/${path.architecture} found in ${resolvedPath}.`
        );
        return;
      }

      if (!pathExists) {
        logger?.warn(
          `Browser archive for ${path.platform}/${path.architecture} not found in ${resolvedPath}.`
        );
      }

      if (foundChecksum !== archiveChecksum) {
        logger?.warn(
          `Browser archive checksum for ${path.platform}/${path.architecture} ` +
            `is ${foundChecksum} but ${archiveChecksum} was expected.`
        );
      }

      const url = paths.getDownloadUrl(path);
      try {
        const downloadedChecksum = await fetch(url, resolvedPath, logger);
        if (downloadedChecksum !== archiveChecksum) {
          logger?.warn(
            `Invalid checksum for ${path.platform}/${path.architecture}: ` +
              `expected ${archiveChecksum} got ${downloadedChecksum}`
          );
          invalidChecksums.push(`${url} => ${resolvedPath}`);
        }
      } catch (error) {
        throw new Error(`Failed to download ${url}: ${error}`);
      }
    })
  );

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
