/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { promisify } from 'util';
import apm from 'elastic-apm-node';
import type { Logger } from 'src/core/server';
import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_INJECTCSS } from './constants';

const fsp = { readFile: promisify(fs.readFile) };

export const injectCustomCss = async (
  browser: HeadlessChromiumDriver,
  logger: Logger,
  layout: Layout
): Promise<void> => {
  const span = apm.startSpan('inject_css', 'correction');
  logger.debug('injecting custom css');

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
      logger
    );
  } catch (err) {
    logger.error(err);
    throw new Error(
      `An error occurred when trying to update Kibana CSS for reporting. ${err.message}`
    );
  }

  span?.end();
};
