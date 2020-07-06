/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { HeadlessChromiumDriver } from '../../../../browsers';
import { LevelLogger, startTrace } from '../../../../lib';
import { ElementsPositionAndAttribute, Screenshot } from '../../../../types';

export const getScreenshots = async (
  browser: HeadlessChromiumDriver,
  elementsPositionAndAttributes: ElementsPositionAndAttribute[],
  logger: LevelLogger
): Promise<Screenshot[]> => {
  logger.info(
    i18n.translate('xpack.reporting.screencapture.takingScreenshots', {
      defaultMessage: `taking screenshots`,
    })
  );

  const screenshots: Screenshot[] = [];

  for (let i = 0; i < elementsPositionAndAttributes.length; i++) {
    const endTrace = startTrace('get_screenshots', 'read');
    const item = elementsPositionAndAttributes[i];
    const base64EncodedData = await browser.screenshot(item.position);

    screenshots.push({
      base64EncodedData,
      title: item.attributes.title,
      description: item.attributes.description,
    });

    endTrace();
  }

  logger.info(
    i18n.translate('xpack.reporting.screencapture.screenshotsTaken', {
      defaultMessage: `screenshots taken: {numScreenhots}`,
      values: {
        numScreenhots: screenshots.length,
      },
    })
  );

  return screenshots;
};
