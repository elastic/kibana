/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import os from 'os';
import path from 'path';
import del from 'del';

import * as Rx from 'rxjs';
import { LevelLogger } from '../lib';
import { ensureBrowserDownloaded } from './download';
// @ts-ignore
import { md5 } from './download/checksum';
// @ts-ignore
import { extract } from './extract';
import { paths } from './chromium/paths';

interface Package {
  platforms: string[];
  architecture: string;
}

/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 */
export function installBrowser(
  logger: LevelLogger,
  chromiumPath: string = path.resolve(__dirname, '../../chromium'),
  platform: string = process.platform,
  architecture: string = os.arch()
): { binaryPath$: Rx.Subject<string> } {
  const binaryPath$ = new Rx.Subject<string>();
  const backgroundInstall = async () => {
    const pkg = paths.packages.find((p: Package) => {
      return p.platforms.includes(platform) && p.architecture === architecture;
    });

    if (!pkg) {
      // TODO: validate this
      throw new Error(`Unsupported platform: ${platform}-${architecture}`);
    }

    const binaryPath = path.join(chromiumPath, pkg.binaryRelativePath);
    const binaryChecksum = await md5(binaryPath).catch(() => '');

    if (binaryChecksum !== pkg.binaryChecksum) {
      await ensureBrowserDownloaded(logger);

      const archive = path.join(paths.archivesPath, pkg.archiveFilename);
      logger.info(`Extracting [${archive}] to [${binaryPath}]`);

      await del(chromiumPath);
      await extract(archive, chromiumPath);
    }

    logger.debug(`Browser executable: ${binaryPath}`);

    binaryPath$.next(binaryPath); // subscribers wait for download and extract to complete
  };

  backgroundInstall();

  return {
    binaryPath$,
  };
}
