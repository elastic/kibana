/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HeadlessChromiumDriver } from '../../browsers';
import { getChromiumDisconnectedError } from '../../browsers/chromium';

/*
 * Call this function within error-handling `catch` blocks while setup and wait
 * for the Kibana URL to be ready for screenshot. This detects if a block of
 * code threw an exception because the page is closed or crashed.
 *
 * Also call once after `setup$` fires in the screenshot pipeline
 */
export const checkPageIsOpen = (browser: HeadlessChromiumDriver) => {
  if (!browser.isPageOpen()) {
    throw getChromiumDisconnectedError();
  }
};
