/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LevelLogger, startTrace } from '../';
import { durationToNumber } from '../../../common/schema_utils';
import { HeadlessChromiumDriver } from '../../browsers';
import { ConditionalHeaders } from '../../export_types/common';
import { CaptureConfig } from '../../types';

export const openUrl = async (
  captureConfig: CaptureConfig,
  browser: HeadlessChromiumDriver,
  url: string,
  pageLoadSelector: string,
  conditionalHeaders: ConditionalHeaders,
  logger: LevelLogger
): Promise<void> => {
  const endTrace = startTrace('open_url', 'wait');
  try {
    const timeout = durationToNumber(captureConfig.timeouts.openUrl);
    await browser.open(
      url,
      { conditionalHeaders, waitForSelector: pageLoadSelector, timeout },
      logger
    );
  } catch (err) {
    logger.error(err);
    throw new Error(
      i18n.translate('xpack.reporting.screencapture.couldntLoadKibana', {
        defaultMessage: `An error occurred when trying to open the Kibana URL. You may need to increase '{configKey}'. {error}`,
        values: { configKey: 'xpack.reporting.capture.timeouts.openUrl', error: err },
      })
    );
  }

  endTrace();
};
