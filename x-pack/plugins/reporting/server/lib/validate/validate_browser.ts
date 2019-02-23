/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as puppeteer from 'puppeteer-core';
import { getAbsoluteUrlFactory } from '../../../common/get_absolute_url';
import { KbnServer, Logger } from '../../../types';
import { CHROMIUM } from '../../browsers/browser_types';

const API_STATS_ENDPOINT = '/api/stats';

/*
 * Validate the Reporting headless browser can launch, and that it can connect
 * to the locally running Kibana instance.
 */
export const validateBrowser = async (server: KbnServer, browserFactory: any, logger: Logger) => {
  if (browserFactory.type === CHROMIUM) {
    return browserFactory
      .test(
        {
          viewport: { width: 800, height: 600 },
        },
        logger
      )
      .then(async (browser: puppeteer.Browser | null) => {
        if (browser && browser.newPage) {
          const getAbsoluteUrl = getAbsoluteUrlFactory(server);
          const page = await browser.newPage();
          const url = getAbsoluteUrl({ path: API_STATS_ENDPOINT });
          logger.debug(`Opening page ${url}`);
          await page.goto(url, { waitUntil: 'networkidle0' }); // Look for JSON response
        } else {
          throw new Error('Could not get handle to browser client!');
        }
        return browser;
      })
      .then((browser: puppeteer.Browser | null) => {
        if (browser && browser.close) {
          browser.close();
        } else {
          throw new Error('Could not close browser client handle!');
        }
      });
  }
};
