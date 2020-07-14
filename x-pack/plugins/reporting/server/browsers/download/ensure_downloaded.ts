/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { existsSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { BrowserDownload, chromium } from '../';
import { LevelLogger } from '../../lib';
import { md5 } from './checksum';
import { clean } from './clean';
import { download } from './download';
import { asyncMap } from './util';

/**
 * Check for the downloaded archive of each requested browser type and
 * download them if they are missing or their checksum is invalid
 * @return {Promise<undefined>}
 */
export async function ensureBrowserDownloaded(logger: LevelLogger) {
  await ensureDownloaded([chromium], logger);
}

/**
 * Clears the unexpected files in the browsers archivesPath
 * and ensures that all packages/archives are downloaded and
 * that their checksums match the declared value
 * @param  {BrowserSpec} browsers
 * @return {Promise<undefined>}
 */
async function ensureDownloaded(browsers: BrowserDownload[], logger: LevelLogger) {
  await asyncMap(browsers, async (browser) => {
    const { archivesPath } = browser.paths;

    await clean(
      archivesPath,
      browser.paths.packages.map((p) => resolvePath(archivesPath, p.archiveFilename)),
      logger
    );

    const invalidChecksums: string[] = [];
    await asyncMap(browser.paths.packages, async ({ archiveFilename, archiveChecksum }) => {
      const url = `${browser.paths.baseUrl}${archiveFilename}`;
      const path = resolvePath(archivesPath, archiveFilename);

      if (existsSync(path) && (await md5(path)) === archiveChecksum) {
        logger.debug(`Browser archive exists in ${path}`);
        return;
      }

      const downloadedChecksum = await download(url, path, logger);
      if (downloadedChecksum !== archiveChecksum) {
        invalidChecksums.push(`${url} => ${path}`);
      }
    });

    if (invalidChecksums.length) {
      const err = new Error(
        `Error downloading browsers, checksums incorrect for:\n    - ${invalidChecksums.join(
          '\n    - '
        )}`
      );
      logger.error(err);
      throw err;
    }
  });
}
