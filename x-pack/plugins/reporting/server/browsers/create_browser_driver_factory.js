/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExtractError } from './extract';
import { ensureBrowserDownloaded } from './download';
import { installBrowser } from './install';
import { LevelLogger } from '../lib/level_logger';

export async function createBrowserDriverFactory(server) {
  const config = server.config();
  const logger = LevelLogger.createForServer(server, ['reporting']);

  const DATA_DIR = config.get('path.data');
  const CAPTURE_CONFIG = config.get('xpack.reporting.capture');
  const BROWSER_TYPE = CAPTURE_CONFIG.browser.type;
  const BROWSER_AUTO_DOWNLOAD = CAPTURE_CONFIG.browser.autoDownload;
  const BROWSER_CONFIG = CAPTURE_CONFIG.browser[BROWSER_TYPE];

  if (BROWSER_AUTO_DOWNLOAD) {
    await ensureBrowserDownloaded(BROWSER_TYPE);
  }

  try {
    const browserDriverFactory = await installBrowser(logger, BROWSER_CONFIG, BROWSER_TYPE, DATA_DIR);
    logger.debug(`Browser installed at ${browserDriverFactory.binaryPath}`);
    return browserDriverFactory;
  } catch (error) {
    if (error instanceof ExtractError) {
      logger.error('Failed to install browser. See kibana logs for more details.');
      throw error;
    }

    logger.error(error);

    if (error.cause) {
      logger.error(error.cause);

      if (['EACCES', 'EEXIST'].includes(error.cause.code)) {
        throw new Error(
          'Insufficient permissions for extracting the browser archive. ' +
          'Make sure the Kibana data directory (path.data) is owned by the same user that is running Kibana.'
        );
      }
    }

    throw new Error('Failed to extract the browser archive. See kibana logs for more details.');
  }
}
