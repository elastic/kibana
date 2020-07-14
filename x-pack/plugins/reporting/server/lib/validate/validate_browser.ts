/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Browser } from 'puppeteer';
import { BROWSER_TYPE } from '../../../common/constants';
import { HeadlessChromiumDriverFactory } from '../../browsers/chromium/driver_factory';
import { LevelLogger } from '../';

/*
 * Validate the Reporting headless browser can launch, and that it can connect
 * to the locally running Kibana instance.
 */
export const validateBrowser = async (
  browserFactory: HeadlessChromiumDriverFactory,
  logger: LevelLogger
) => {
  if (browserFactory.type === BROWSER_TYPE) {
    return browserFactory.test(logger).then((browser: Browser | null) => {
      if (browser && browser.close) {
        browser.close();
      } else {
        throw new Error('Could not close browser client handle!');
      }
    });
  }
};
