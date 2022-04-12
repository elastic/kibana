/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Logger } from 'src/core/server';
import type { HeadlessChromiumDriver } from '../browsers';
import type { ElementsPositionAndAttribute } from './get_element_position_data';
import type { Screenshot } from './types';

export const getScreenshots = async (
  browser: HeadlessChromiumDriver,
  logger: Logger,
  elementsPositionAndAttributes: ElementsPositionAndAttribute[]
): Promise<Screenshot[]> => {
  logger.info(`taking screenshots`);

  const screenshots: Screenshot[] = [];

  for (let i = 0; i < elementsPositionAndAttributes.length; i++) {
    const span = apm.startSpan('get_screenshots', 'read');
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

    span?.end();
  }

  logger.info(`screenshots taken: ${screenshots.length}`);

  return screenshots;
};
