/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeadlessChromiumDriver } from '../browsers';
import { EventLogger } from './event_logger';
import type { ElementsPositionAndAttribute } from './get_element_position_data';

export interface Screenshot {
  /**
   * Screenshot PNG image data.
   */
  data: Buffer;

  /**
   * Screenshot title.
   */
  title: string | null;

  /**
   * Screenshot description.
   */
  description: string | null;
}

export const getScreenshots = async (
  browser: HeadlessChromiumDriver,
  eventLogger: EventLogger,
  elementsPositionAndAttributes: ElementsPositionAndAttribute[]
): Promise<Screenshot[]> => {
  const { kbnLogger: logger } = eventLogger;
  logger.info(`taking screenshots`);

  const screenshots: Screenshot[] = [];

  for (let i = 0; i < elementsPositionAndAttributes.length; i++) {
    const item = elementsPositionAndAttributes[i];

    const data = await browser.screenshot(item.position);

    if (!data?.byteLength) {
      throw new Error(`Failure in getScreenshots! Screenshot data is void`);
    }

    screenshots.push({
      data,
      title: item.attributes.title,
      description: item.attributes.description,
    });
  }

  logger.info(`screenshots taken: ${screenshots.length}`);

  return screenshots;
};
