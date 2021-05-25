/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import del from 'del';
import os from 'os';
import path from 'path';
import * as Rx from 'rxjs';
import { GenericLevelLogger } from '../lib/level_logger';
import { ChromiumArchivePaths } from './chromium';
import { ensureBrowserDownloaded } from './download';
import { md5 } from './download/checksum';
import { extract } from './extract';

/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 */
export function installBrowser(
  logger: GenericLevelLogger,
  chromiumPath: string = path.resolve(__dirname, '../../chromium'),
  platform: string = process.platform,
  architecture: string = os.arch()
): { binaryPath$: Rx.Subject<string> } {
  const binaryPath$ = new Rx.Subject<string>();

  const paths = new ChromiumArchivePaths();
  const pkg = paths.find(platform, architecture);

  if (!pkg) {
    throw new Error(`Unsupported platform: ${platform}-${architecture}`);
  }

  const backgroundInstall = async () => {
    const binaryPath = paths.getBinaryPath(pkg);
    const binaryChecksum = await md5(binaryPath).catch(() => '');

    if (binaryChecksum !== pkg.binaryChecksum) {
      await ensureBrowserDownloaded(logger);
      await del(chromiumPath);

      const archive = path.join(paths.archivesPath, pkg.archiveFilename);
      logger.info(`Extracting [${archive}] to [${chromiumPath}]`);
      await extract(archive, chromiumPath);
    }

    logger.info(`Browser executable: ${binaryPath}`);
    binaryPath$.next(binaryPath); // subscribers wait for download and extract to complete
  };

  backgroundInstall();

  return {
    binaryPath$,
  };
}
