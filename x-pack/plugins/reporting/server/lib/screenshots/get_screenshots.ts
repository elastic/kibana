/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LevelLogger, startTrace } from '../';
import { HeadlessChromiumDriver } from '../../browsers';
import { LayoutInstance } from '../layouts';
import { ElementsPositionAndAttribute, Screenshot } from './';

export const getScreenshots = async (
  browser: HeadlessChromiumDriver,
  layout: LayoutInstance,
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

    if (!base64EncodedData) {
      throw new Error(`Failure in getScreenshots! Base64 data is void`);
    }

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
