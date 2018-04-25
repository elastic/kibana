/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as chromium from './chromium';
import * as phantom from './phantom';

export const BROWSERS_BY_TYPE = {
  chromium,
  phantom,
};

export function createDriverFactory(browserType, spawnBrowser$, browserConfig, logger) {
  return BROWSERS_BY_TYPE[browserType].createDriverFactory(spawnBrowser$, browserConfig, logger);
}

export function getArchivesPath(browserType) {
  return BROWSERS_BY_TYPE[browserType].paths.archivesPath;
}

export function getPackage(browserType) {
  const browser = BROWSERS_BY_TYPE[browserType];
  const pkg = browser.paths.packages.find(p => p.platforms.includes(process.platform));
  if (!pkg) {
    throw new Error('Unsupported platform: platform');
  }

  return pkg;
}

export function getArgs(browserType, params) {
  const browser = BROWSERS_BY_TYPE[browserType];
  return browser.args(params);
}
