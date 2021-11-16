/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Writable } from 'stream';
import { LevelLogger, startTrace } from '../';
import { HeadlessChromiumDriver } from '../../browsers';
import { ElementsPositionAndAttribute, Screenshot } from './';

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

    const data = await browser.screenshot(item.position);

    if (!data?.byteLength) {
      throw new Error(`Failure in getScreenshots! Screenshot data is void`);
    }

    screenshots.push({
      data,
      title: item.attributes.title,
      description: item.attributes.description,
      byteLength: data.byteLength,
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

export const streamScreenshots = async (
  browser: HeadlessChromiumDriver,
  stream: Writable,
  elementsPositionAndAttributes: ElementsPositionAndAttribute[],
  logger: LevelLogger
): Promise<Screenshot[]> => {
  logger.info(`taking screenshots`);

  const screenshots: Screenshot[] = [];

  for (let i = 0; i < elementsPositionAndAttributes.length; i++) {
    const endTrace = startTrace('get_screenshots', 'read');
    const item = elementsPositionAndAttributes[i];

    const data = await browser.screenshot(item.position);

    if (!data?.byteLength) {
      throw new Error(`Failure in getScreenshots! Screenshot data is void`);
    }

    stream.write(data);

    screenshots.push({
      title: item.attributes.title,
      description: item.attributes.description,
      byteLength: data.byteLength,
    });

    endTrace();
  }

  logger.info(`screenshots taken: ${screenshots.length}`);

  return screenshots;
};

/*
 *
 *
{
  "elementsPositionAndAttributes": [
    {
      "position": {
        "boundingClientRect": {
          "top": 96,
          "left": 0,
          "width": 2553,
          "height": 1100
        },
        "scroll": {
          "x": 0,
          "y": 0
        }
      },
      "attributes": {
        "title": "[Tim] Test Dashboard",
        "description": ""
      }
    }
  ]
}

*/
