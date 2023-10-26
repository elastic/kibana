/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from '@kbn/logging';
import { parseDuration, RulesSettingsQueryDelayProperties } from '../../common';

interface GetTimeRangeOpts {
  logger: Logger;
  queryDelaySettings?: RulesSettingsQueryDelayProperties;
  window?: string;
  nowDate?: string;
}
export function getTimeRange({ logger, queryDelaySettings, nowDate, window }: GetTimeRangeOpts) {
  let timeWindow: number = 0;
  if (window) {
    try {
      timeWindow = parseDuration(window);
    } catch (err) {
      throw new Error(
        i18n.translate('xpack.alerting.invalidWindowSizeErrorMessage', {
          defaultMessage: 'Invalid format for windowSize: "{window}"',
          values: {
            window,
          },
        })
      );
    }
  }

  if (queryDelaySettings) {
    logger.debug(`Adjusting rule query time range by ${queryDelaySettings.delay} seconds`);
  }

  const queryDelay = queryDelaySettings ? queryDelaySettings.delay * 1000 : 0;
  const date = nowDate ? new Date(nowDate).valueOf() : Date.now();
  const dateStart = new Date(date - (timeWindow + queryDelay)).toISOString();
  const dateEnd = new Date(date - queryDelay).toISOString();

  return { dateStart, dateEnd };
}
