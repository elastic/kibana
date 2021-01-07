/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LevelLogger, startTrace } from '../';
import { HeadlessChromiumDriver } from '../../browsers';
import { LayoutInstance } from '../layouts';
import { ElementsPositionAndAttribute, Screenshot } from './';
import { CONTEXT_GETBROWSERDIMENSIONS } from './constants';

// In Puppeteer 5.4+, the viewport size limits what the screenshot can take, even if a clip is specified. The clip area must
// be visible in the viewport. This workaround resizes the viewport to the actual content height and width.
// NOTE: this will fire a window resize event
const resizeToClipArea = async (
  item: ElementsPositionAndAttribute,
  browser: HeadlessChromiumDriver,
  zoom: number,
  logger: LevelLogger
) => {
  // Check current viewport size
  const { width, height, left, top } = item.position.boundingClientRect; // the "unscaled" pixel sizes
  const [viewWidth, viewHeight] = await browser.evaluate(
    {
      fn: () => [document.body.clientWidth, document.body.clientHeight],
      args: [],
    },
    { context: CONTEXT_GETBROWSERDIMENSIONS },
    logger
  );

  logger.debug(`Browser viewport: width=${viewWidth} height=${viewHeight}`);

  // Resize the viewport if the clip area is not visible
  if (viewWidth < width + left || viewHeight < height + top) {
    logger.debug(`Item's position is not within the viewport.`);

    // add left and top margin to unscaled measurements
    const newWidth = width + left;
    const newHeight = height + top;

    logger.debug(
      `Resizing browser viewport to: width=${newWidth} height=${newHeight} zoom=${zoom}`
    );

    await browser.setViewport(
      {
        width: newWidth,
        height: newHeight,
        zoom,
      },
      logger
    );
  }

  logger.debug(`Capturing item: width=${width} height=${height} left=${left} top=${top}`);
};

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

    await resizeToClipArea(item, browser, layout.getBrowserZoom(), logger);
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
