/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import * as Rx from 'rxjs';
import { first } from 'rxjs/operators';
import { promisify } from 'util';
import { ReportingConfig } from '../';
import { LevelLogger } from '../lib';
import { BrowserDownload } from './';
import { ensureBrowserDownloaded } from './download';
// @ts-ignore
import { md5 } from './download/checksum';
// @ts-ignore
import { extract } from './extract';

const chmod = promisify(fs.chmod);

interface Package {
  platforms: string[];
}

/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 */
export function installBrowser(
  browser: BrowserDownload,
  config: ReportingConfig,
  logger: LevelLogger
): { binaryPath$: Rx.Subject<string> } {
  const binaryPath$ = new Rx.Subject<string>();
  const backgroundInstall = async () => {
    const captureConfig = config.get('capture');
    const { autoDownload, type: browserType } = captureConfig.browser;
    if (autoDownload) {
      await ensureBrowserDownloaded(browserType, logger);
    }

    const pkg = browser.paths.packages.find((p: Package) => p.platforms.includes(process.platform));
    if (!pkg) {
      throw new Error(`Unsupported platform: ${JSON.stringify(browser, null, 2)}`);
    }

    const dataDir = await config.kbnConfig.get('path', 'data').pipe(first()).toPromise();
    const binaryPath = path.join(dataDir, pkg.binaryRelativePath);

    try {
      const binaryChecksum = await md5(binaryPath).catch(() => '');

      if (binaryChecksum !== pkg.binaryChecksum) {
        const archive = path.join(browser.paths.archivesPath, pkg.archiveFilename);
        logger.info(`Extracting [${archive}] to [${binaryPath}]`);
        await extract(archive, dataDir);
        await chmod(binaryPath, '755');
      }
    } catch (error) {
      if (error.cause && ['EACCES', 'EEXIST'].includes(error.cause.code)) {
        logger.error(
          `Error code ${error.cause.code}: Insufficient permissions for extracting the browser archive. ` +
            `Make sure the Kibana data directory (path.data) is owned by the same user that is running Kibana.`
        );
      }

      throw error; // reject the promise with the original error
    }

    logger.debug(`Browser executable: ${binaryPath}`);

    binaryPath$.next(binaryPath); // subscribers wait for download and extract to complete
  };

  backgroundInstall();

  return {
    binaryPath$,
  };
}
