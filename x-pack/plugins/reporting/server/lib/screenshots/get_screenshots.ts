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

    // In Puppeteer 5.4+, the viewport size limits what the screenshot can take, even if a clip is specified. The clip area must
    // be visible in the viewport. This workaround resizes the viewport to the actual content height and width.
    // NOTE: this will fire a window resize event

    // Check current viewport size
    const [height, width] = await browser.evaluate(
      {
        fn: () => [document.body.clientHeight, document.body.clientWidth],
        args: [],
      },
      { context: CONTEXT_GETBROWSERDIMENSIONS },
      logger
    );

    logger.debug(`Browser viewport: height: ${height}, width: ${width}`);

    // Resize the viewport if the clip area is not visible
    if (
      height < item.position.boundingClientRect.height + item.position.boundingClientRect.top ||
      width < item.position.boundingClientRect.width + item.position.boundingClientRect.left
    ) {
      await browser.setViewport(
        {
          height: item.position.boundingClientRect.height + item.position.boundingClientRect.top,
          width: item.position.boundingClientRect.width + item.position.boundingClientRect.left,
          zoom: layout.getBrowserZoom(),
        },
        logger
      );
    }

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
