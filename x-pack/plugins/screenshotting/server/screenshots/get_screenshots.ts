/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeadlessChromiumDriver } from '../browsers';
import { Actions, EventLogger } from './event_logger';
import type { ElementsPositionAndAttribute } from './get_element_position_data';
import type { Screenshot } from './types';

export const getScreenshots = async (
  browser: HeadlessChromiumDriver,
  eventLogger: EventLogger,
  elementsPositionAndAttributes: ElementsPositionAndAttribute[]
): Promise<Screenshot[]> => {
  const { kbnLogger } = eventLogger;
  kbnLogger.info(`taking screenshots`);

  const screenshots: Screenshot[] = [];

  try {
    for (let i = 0; i < elementsPositionAndAttributes.length; i++) {
      const item = elementsPositionAndAttributes[i];
      const endScreenshot = eventLogger.logScreenshottingEvent(
        'screenshot capture',
        Actions.GET_SCREENSHOT,
        'read',
        eventLogger.getPixelsFromElementPosition(item.position)
      );

      const data = await browser.screenshot(item.position);

      if (!data?.byteLength) {
        throw new Error(`Failure in getScreenshots! Screenshot data is void`);
      }

      screenshots.push({
        data,
        title: item.attributes.title,
        description: item.attributes.description,
      });

      endScreenshot({ byte_length: data.byteLength });
    }
  } catch (error) {
    kbnLogger.error(error);
    eventLogger.error(error, Actions.GET_SCREENSHOT);
    throw error;
  }

  kbnLogger.info(`screenshots taken: ${screenshots.length}`);

  return screenshots;
};
