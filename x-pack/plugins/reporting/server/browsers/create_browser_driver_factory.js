/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ensureBrowserDownloaded } from './download';
import { installBrowser } from './install';
import { LevelLogger } from '../lib/level_logger';

export async function createBrowserDriverFactory(server) {
  const config = server.config();
  const logger = LevelLogger.createForServer(server, ['reporting', 'browser-driver']);

  const DATA_DIR = config.get('path.data');
  const CAPTURE_CONFIG = config.get('xpack.reporting.capture');
  const BROWSER_TYPE = CAPTURE_CONFIG.browser.type;
  const BROWSER_AUTO_DOWNLOAD = CAPTURE_CONFIG.browser.autoDownload;
  const BROWSER_CONFIG = CAPTURE_CONFIG.browser[BROWSER_TYPE];
  const REPORTING_TIMEOUT = config.get('xpack.reporting.queue.timeout');

  if (BROWSER_AUTO_DOWNLOAD) {
    await ensureBrowserDownloaded(BROWSER_TYPE);
  }

  try {
    const browserDriverFactory = await installBrowser(logger, BROWSER_CONFIG, BROWSER_TYPE, DATA_DIR, REPORTING_TIMEOUT);
    logger.debug(`Browser installed at ${browserDriverFactory.binaryPath}`);
    return browserDriverFactory;
  } catch (error) {
    if (error.cause && ['EACCES', 'EEXIST'].includes(error.cause.code)) {
      logger.error(
        `Error code ${error.cause.code}: Insufficient permissions for extracting the browser archive. ` +
        `Make sure the Kibana data directory (path.data) is owned by the same user that is running Kibana.`
      );
    }

    throw error; // reject the promise with the original error
  }
}
