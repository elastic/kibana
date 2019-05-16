/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { BROWSERS_BY_TYPE } from './browsers';
import { extract } from './extract';
import { md5 } from './download/checksum';

const chmod = promisify(fs.chmod);

/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 * @param {LevelLogger} logger
 * @param {Object} browserConfig - configuration options for the given browser type.
 * @param  {String} browserType
 * @param  {String} installsPath
 * @return {Promise<undefined>}
 */
export async function installBrowser(logger, browserConfig, browserType, installsPath, queueTimeout) {
  const browser = BROWSERS_BY_TYPE[browserType];
  const pkg = browser.paths.packages.find(p => p.platforms.includes(process.platform));

  if (!pkg) {
    throw new Error(`Unsupported platform: ${JSON.stringify(browser, null, 2)}`);
  }

  const binaryPath = path.join(installsPath, pkg.binaryRelativePath);
  const rawChecksum = await md5(binaryPath).catch(() => '');

  if (rawChecksum !== pkg.rawChecksum) {
    const archive = path.join(browser.paths.archivesPath, pkg.archiveFilename);
    logger.debug(`Extracting [${archive}] to [${binaryPath}]`);
    await extract(archive, installsPath);
    await chmod(binaryPath, '755');
  }

  return browser.createDriverFactory(binaryPath, logger, browserConfig, queueTimeout);
}
