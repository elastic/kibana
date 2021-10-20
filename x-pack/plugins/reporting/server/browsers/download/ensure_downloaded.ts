/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync } from 'fs';
import del from 'del';
import { BrowserDownload, chromium } from '../';
import { GenericLevelLogger } from '../../lib/level_logger';
import { md5 } from './checksum';
import { download } from './download';

/**
 * Check for the downloaded archive of each requested browser type and
 * download them if they are missing or their checksum is invalid
 */
export async function ensureBrowserDownloaded(logger: GenericLevelLogger) {
  await ensureDownloaded([chromium], logger);
}

/**
 * Clears the unexpected files in the browsers archivesPath
 * and ensures that all packages/archives are downloaded and
 * that their checksums match the declared value
 */
async function ensureDownloaded(browsers: BrowserDownload[], logger: GenericLevelLogger) {
  await Promise.all(
    browsers.map(async ({ paths: pSet }) => {
      const removedFiles = await del(`${pSet.archivesPath}/**/*`, {
        force: true,
        onlyFiles: true,
        ignore: pSet.getAllArchiveFilenames(),
      });

      removedFiles.forEach((path) => {
        logger.warning(`Deleting unexpected file ${path}`);
      });

      const invalidChecksums: string[] = [];
      await Promise.all(
        pSet.packages.map(async (p) => {
          const { archiveFilename, archiveChecksum } = p;
          if (archiveFilename && archiveChecksum) {
            const path = pSet.resolvePath(p);
            const pathExists = existsSync(path);

            let foundChecksum: string;
            try {
              foundChecksum = await md5(path).catch();
            } catch {
              foundChecksum = 'MISSING';
            }

            if (pathExists && foundChecksum === archiveChecksum) {
              logger.debug(`Browser archive for ${p.platform}/${p.architecture} found in ${path} `);
              return;
            }

            if (!pathExists) {
              logger.warning(
                `Browser archive for ${p.platform}/${p.architecture} not found in ${path}.`
              );
            }
            if (foundChecksum !== archiveChecksum) {
              logger.warning(
                `Browser archive checksum for ${p.platform}/${p.architecture} ` +
                  `is ${foundChecksum} but ${archiveChecksum} was expected.`
              );
            }

            const url = pSet.getDownloadUrl(p);
            try {
              const downloadedChecksum = await download(url, path, logger);
              if (downloadedChecksum !== archiveChecksum) {
                logger.warning(
                  `Invalid checksum for ${p.platform}/${p.architecture}: ` +
                    `expected ${archiveChecksum} got ${downloadedChecksum}`
                );
                invalidChecksums.push(`${url} => ${path}`);
              }
            } catch (err) {
              throw new Error(`Failed to download ${url}: ${err}`);
            }
          }
        })
      );

      if (invalidChecksums.length) {
        const err = new Error(
          `Error downloading browsers, checksums incorrect for:\n    - ${invalidChecksums.join(
            '\n    - '
          )}`
        );
        logger.error(err);
        throw err;
      }
    })
  );
}
