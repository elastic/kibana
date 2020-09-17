/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LevelLogger, startTrace } from '../';
import { LayoutInstance } from '../../../common/types';
import { HeadlessChromiumDriver } from '../../browsers';
import { CONTEXT_GETTIMERANGE } from './constants';

export const getTimeRange = async (
  browser: HeadlessChromiumDriver,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<string | null> => {
  const endTrace = startTrace('get_time_range', 'read');
  logger.debug('getting timeRange');

  const timeRange = await browser.evaluate(
    {
      fn: (durationAttribute) => {
        const durationElement = document.querySelector(`[${durationAttribute}]`);

        if (!durationElement) {
          return null;
        }

        const duration = durationElement.getAttribute(durationAttribute);
        if (!duration) {
          return null;
        }

        return duration; // user-friendly date string
      },
      args: [layout.selectors.timefilterDurationAttribute],
    },
    { context: CONTEXT_GETTIMERANGE },
    logger
  );

  if (timeRange) {
    logger.info(`timeRange: ${timeRange}`);
  } else {
    logger.debug('no timeRange');
  }

  endTrace();

  return timeRange;
};
