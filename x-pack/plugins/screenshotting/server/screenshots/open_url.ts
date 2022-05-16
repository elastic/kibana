/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Logger } from 'src/core/server';
import type { Layout } from 'src/plugins/screenshot_mode/common';
import { Context } from '../../common';
import type { HeadlessChromiumDriver } from '../browsers';
import type { ConditionalHeaders } from '../browsers';
import { CONTEXT_DEBUG, DEFAULT_PAGELOAD_SELECTOR } from './constants';

type Url = string;
type UrlWithContext = [url: Url, context: Context];
export type UrlOrUrlWithContext = Url | UrlWithContext;

export const openUrl = async (
  browser: HeadlessChromiumDriver,
  logger: Logger,
  timeout: number,
  index: number,
  urlOrUrlWithContext: UrlOrUrlWithContext,
  conditionalHeaders: ConditionalHeaders,
  layout?: Layout
): Promise<void> => {
  // If we're moving to another page in the app, we'll want to wait for the app to tell us
  // it's loaded the next page.
  const page = index + 1;
  const waitForSelector = page > 1 ? `[data-shared-page="${page}"]` : DEFAULT_PAGELOAD_SELECTOR;
  const span = apm.startSpan('open_url', 'wait');

  let url: string;
  let context: Context | undefined;

  if (typeof urlOrUrlWithContext === 'string') {
    url = urlOrUrlWithContext;
  } else {
    [url, context] = urlOrUrlWithContext;
  }

  try {
    await browser.open(
      url,
      { conditionalHeaders, context, layout, waitForSelector, timeout },
      logger
    );

    // Debug logging for viewport size and resizing
    await browser.evaluate(
      {
        fn() {
          // eslint-disable-next-line no-console
          console.log(
            `Navigating URL with viewport size: width=${window.innerWidth} height=${window.innerHeight} scaleFactor:${window.devicePixelRatio}`
          );
          window.addEventListener('resize', () => {
            // eslint-disable-next-line no-console
            console.log(
              `Detected a viewport resize: width=${window.innerWidth} height=${window.innerHeight} scaleFactor:${window.devicePixelRatio}`
            );
          });
        },
        args: [],
      },
      { context: CONTEXT_DEBUG },
      logger
    );
  } catch (err) {
    logger.error(err);
    throw new Error(`An error occurred when trying to open the Kibana URL: ${err.message}`);
  }

  span?.end();
};
