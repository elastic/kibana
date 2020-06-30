/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import fs from 'fs';
import { promisify } from 'util';
import { HeadlessChromiumDriver } from '../../../../browsers';
import { LevelLogger, startTrace } from '../../../../lib';
import { Layout } from '../../layouts/layout';
import { CONTEXT_INJECTCSS } from './constants';

const fsp = { readFile: promisify(fs.readFile) };

export const injectCustomCss = async (
  browser: HeadlessChromiumDriver,
  layout: Layout,
  logger: LevelLogger
): Promise<void> => {
  const endTrace = startTrace('inject_css', 'correction');
  logger.debug(
    i18n.translate('xpack.reporting.screencapture.injectingCss', {
      defaultMessage: 'injecting custom css',
    })
  );

  const filePath = layout.getCssOverridesPath();
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
    throw new Error(
      i18n.translate('xpack.reporting.screencapture.injectCss', {
        defaultMessage: `An error occurred when trying to update Kibana CSS for reporting. {error}`,
        values: { error: err },
      })
    );
  }

  endTrace();
};
