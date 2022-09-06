/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Logger } from 'src/core/server';
import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
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

/**
 * Resize the viewport to contain the element to capture.
 *
 * @async
 * @param {HeadlessChromiumDriver} browser - used for its methods to control the page
 * @param {ElementsPositionAndAttribute['position']} position - position data for the element to capture
 * @param {Layout} layout - used for client-side layout data from the job params
 * @param {Logger} logger
 */
const resizeViewport = async (
  browser: HeadlessChromiumDriver,
  position: ElementsPositionAndAttribute['position'],
  layout: Layout,
  logger: Logger
) => {
  const { boundingClientRect, scroll } = position;

  // Using width from the layout is preferred, it avoids the elements moving around horizontally,
  // which would invalidate the position data that was passed in.
  const width = layout.width || boundingClientRect.left + scroll.x + boundingClientRect.width;

  await browser.setViewport(
    {
      width,
      height: boundingClientRect.top + scroll.y + boundingClientRect.height,
      zoom: layout.getBrowserZoom(),
    },
    logger
  );
};

/**
 * Get screenshots of multiple areas of the page
 *
 * @async
 * @param {HeadlessChromiumDriver} browser - used for its methods to control the page
 * @param {Logger} logger
 * @param {ElementsPositionAndAttribute[]} elementsPositionAndAttributes[] - position data about all the elements to capture
 * @param {Layout} layout - used for client-side layout data from the job params
 * @returns {Promise<Screenshot[]>}
 */
export const getScreenshots = async (
  browser: HeadlessChromiumDriver,
  logger: Logger,
  elementsPositionAndAttributes: ElementsPositionAndAttribute[],
  layout: Layout
): Promise<Screenshot[]> => {
  logger.info(`taking screenshots`);

  const screenshots: Screenshot[] = [];

  for (let i = 0; i < elementsPositionAndAttributes.length; i++) {
    const span = apm.startSpan('get_screenshots', 'read');
    const item = elementsPositionAndAttributes[i];

    await resizeViewport(browser, item.position, layout, logger);

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
