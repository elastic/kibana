/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as chromiumDefinition from './chromium';

export { ensureAllBrowsersDownloaded } from './download';
export { createBrowserDriverFactory } from './create_browser_driver_factory';

export { HeadlessChromiumDriver } from './chromium/driver';
export { HeadlessChromiumDriverFactory } from './chromium/driver_factory';

export const chromium = {
  paths: chromiumDefinition.paths,
  createDriverFactory: chromiumDefinition.createDriverFactory,
};

export interface BrowserDownload {
  paths: {
    archivesPath: string;
    baseUrl: string;
    packages: Array<{
      archiveChecksum: string;
      archiveFilename: string;
      binaryChecksum: string;
      binaryRelativePath: string;
      platforms: string[];
    }>;
  };
}
