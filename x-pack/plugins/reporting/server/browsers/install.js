/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'bluebird';
import { extract } from './extract';
import { createDriverFactory, getArchivesPath, getPackage } from './browsers';

const fsp = {
  access: promisify(fs.access, fs),
  chmod: promisify(fs.chmod, fs),
};

/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 * @param {LevelLogger} logger
 * @param {Object} browserConfig - configuration options for the given browser type.
 * @param  {String} browserType
 * @param  {String} installsPath
 * @return {Promise<undefined>}
 */
export async function installBrowser(browserType, installsPath, spawnBrowser$, logger, browserConfig) {
  const pkg = getPackage(browserType);

  const binaryPath = path.join(installsPath, pkg.binaryRelativePath);
  try {
    await fsp.access(binaryPath, fs.X_OK);
  } catch (accessErr) {
    // error here means the binary does not exist, so install it
    const archive = path.join(getArchivesPath(browserType), pkg.archiveFilename);
    await extract(archive, installsPath);
    await fsp.chmod(binaryPath, '755');
  }

  return createDriverFactory(browserType, spawnBrowser$, logger, browserConfig);
}
