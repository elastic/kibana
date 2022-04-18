/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_GETNUMBEROFITEMS, CONTEXT_READMETADATA } from './constants';
import { Actions, EventLogger } from './event_logger';

export const getNumberOfItems = async (
  browser: HeadlessChromiumDriver,
  eventLogger: EventLogger,
  timeout: number,
  layout: Layout
): Promise<number> => {
  eventLogger.getNumberOfItemsStart();

  const { renderComplete: renderCompleteSelector, itemsCountAttribute } = layout.selectors;
  let itemsCount: number;

  try {
    // the dashboard is using the `itemsCountAttribute` attribute to let us
    // know how many items to expect since gridster incrementally adds panels
    // we have to use this hint to wait for all of them
    await browser.waitForSelector(
      `${renderCompleteSelector},[${itemsCountAttribute}]`,
      { timeout },
      { context: CONTEXT_READMETADATA },
      eventLogger.kbnLogger
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
      eventLogger.kbnLogger
    );
  } catch (error) {
    const newError = new Error(
      `An error occurred when trying to read the page for visualization panel info: ${error.message}`
    );
    eventLogger.error(newError, Actions.GET_NUMBER_OF_ITEMS);
    throw newError;
  }

  eventLogger.getNumberOfItemsEnd({ itemsCount });

  return itemsCount;
};
