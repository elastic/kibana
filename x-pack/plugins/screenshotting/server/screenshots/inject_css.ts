/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { promisify } from 'util';
import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_INJECTCSS } from './constants';
import { Actions, EventLogger } from './event_logger';

const fsp = { readFile: promisify(fs.readFile) };

export const injectCustomCss = async (
  browser: HeadlessChromiumDriver,
  eventLogger: EventLogger,
  layout: Layout
): Promise<void> => {
  eventLogger.injectCssBegin();

  const filePath = layout.getCssOverridesPath();
  if (!filePath) {
    return;
  }
  const buffer = await fsp.readFile(filePath);
  try {
    await browser.evaluate(
      {
        fn: (css) => {
          const node = document.createElement('style');
          node.type = 'text/css';
          node.innerHTML = css; // eslint-disable-line no-unsanitized/property
          document.getElementsByTagName('head')[0].appendChild(node);
        },
        args: [buffer.toString()],
      },
      { context: CONTEXT_INJECTCSS },
      eventLogger.kbnLogger
    );
  } catch (err) {
    eventLogger.error(err, Actions.INJECT_CSS);
    throw new Error(
      `An error occurred when trying to update Kibana CSS for reporting. ${err.message}`
    );
  }

  eventLogger.injectCssEnd();
};
