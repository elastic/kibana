/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_GETTIMERANGE } from './constants';
import { Actions, EventLogger } from './event_logger';

export const getTimeRange = async (
  browser: HeadlessChromiumDriver,
  eventLogger: EventLogger,
  layout: Layout
): Promise<string | null> => {
  const spanEnd = eventLogger.logScreenshottingEvent(
    'looking for time range',
    Actions.GET_TIMERANGE,
    'read'
  );

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
    eventLogger.kbnLogger
  );

  if (timeRange) {
    eventLogger.kbnLogger.info(`timeRange: ${timeRange}`);
  }

  spanEnd();

  return timeRange;
};
