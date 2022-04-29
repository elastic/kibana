/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Logger } from '@kbn/core/server';
import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_GETTIMERANGE } from './constants';

export const getTimeRange = async (
  browser: HeadlessChromiumDriver,
  logger: Logger,
  layout: Layout
): Promise<string | null> => {
  const span = apm.startSpan('get_time_range', 'read');
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

  span?.end();

  return timeRange;
};
