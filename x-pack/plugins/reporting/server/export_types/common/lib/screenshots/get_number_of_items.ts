/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { HeadlessChromiumDriver } from '../../../../browsers';
import { LevelLogger, startTrace } from '../../../../lib';
import { CaptureConfig } from '../../../../types';
import { LayoutInstance } from '../../layouts';
import { CONTEXT_GETNUMBEROFITEMS, CONTEXT_READMETADATA } from './constants';

export const getNumberOfItems = async (
  captureConfig: CaptureConfig,
  browser: HeadlessChromiumDriver,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<number> => {
  const endTrace = startTrace('get_number_of_items', 'read');
  const { renderComplete: renderCompleteSelector, itemsCountAttribute } = layout.selectors;
  let itemsCount: number;

  logger.debug(
    i18n.translate('xpack.reporting.screencapture.logWaitingForElements', {
      defaultMessage: 'waiting for elements or items count attribute; or not found to interrupt',
    })
  );

  try {
    // the dashboard is using the `itemsCountAttribute` attribute to let us
    // know how many items to expect since gridster incrementally adds panels
    // we have to use this hint to wait for all of them
    await browser.waitForSelector(
      `${renderCompleteSelector},[${itemsCountAttribute}]`,
      { timeout: captureConfig.timeouts.waitForElements },
      { context: CONTEXT_READMETADATA },
      logger
    );

    // returns the value of the `itemsCountAttribute` if it's there, otherwise
    // we just count the number of `itemSelector`: the number of items already rendered
    itemsCount = await browser.evaluate(
      {
        fn: (selector, countAttribute) => {
          const elementWithCount = document.querySelector(`[${countAttribute}]`);
          if (elementWithCount && elementWithCount != null) {
            const count = elementWithCount.getAttribute(countAttribute);
            if (count && count != null) {
              return parseInt(count, 10);
            }
          }

          return document.querySelectorAll(selector).length;
        },
        args: [renderCompleteSelector, itemsCountAttribute],
      },
      { context: CONTEXT_GETNUMBEROFITEMS },
      logger
    );
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.reporting.screencapture.readVisualizationsError', {
        defaultMessage: `An error occurred when trying to read the page for visualization panel info. You may need to increase '{configKey}'. {error}`,
        values: {
          error: err,
          configKey: 'xpack.reporting.capture.timeouts.waitForElements',
        },
      })
    );
    itemsCount = 1;
  }

  endTrace();

  return itemsCount;
};
