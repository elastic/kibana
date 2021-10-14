/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LocatorParams, UrlOrUrlLocatorTuple } from '../../../common/types';
import { LevelLogger, startTrace } from '../';
import { durationToNumber } from '../../../common/schema_utils';
import { HeadlessChromiumDriver } from '../../browsers';
import { ConditionalHeaders } from '../../export_types/common';
import { CaptureConfig } from '../../types';
import { DEFAULT_PAGELOAD_SELECTOR } from './constants';

export const openUrl = async (
  captureConfig: CaptureConfig,
  browser: HeadlessChromiumDriver,
  index: number,
  urlOrUrlLocatorTuple: UrlOrUrlLocatorTuple,
  conditionalHeaders: ConditionalHeaders,
  logger: LevelLogger
): Promise<void> => {
  // If we're moving to another page in the app, we'll want to wait for the app to tell us
  // it's loaded the next page.
  const page = index + 1;
  const waitForSelector = page > 1 ? `[data-shared-page="${page}"]` : DEFAULT_PAGELOAD_SELECTOR;

  const endTrace = startTrace('open_url', 'wait');
  let url: string;
  let locator: undefined | LocatorParams;

  if (typeof urlOrUrlLocatorTuple === 'string') {
    url = urlOrUrlLocatorTuple;
  } else {
    [url, locator] = urlOrUrlLocatorTuple;
  }

  try {
    const timeout = durationToNumber(captureConfig.timeouts.openUrl);
    await browser.open(url, { conditionalHeaders, waitForSelector, timeout, locator }, logger);
  } catch (err) {
    logger.error(err);
    throw new Error(
      i18n.translate('xpack.reporting.screencapture.couldntLoadKibana', {
        defaultMessage: `An error occurred when trying to open the Kibana URL: {error}`,
        values: { error: err },
      })
    );
  }

  endTrace();
};
