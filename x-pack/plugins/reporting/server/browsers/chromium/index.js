/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriverFactory } from './driver_factory';

export { paths } from './paths';

export { args } from './args';

export async function createDriverFactory(spawnChromium$, logger, browserConfig) {
  if (browserConfig.disableSandbox) {
    logger.warning(`Enabling the Chromium sandbox provides an additional layer of protection.`);
  }

  return new HeadlessChromiumDriverFactory(spawnChromium$, logger, browserConfig);
}
