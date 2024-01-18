/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from '@kbn/logging';
import dateMath from '@kbn/datemath';
import { parseDuration, RulesSettingsQueryDelayProperties } from '../../common';

const NOW_STRING = 'now';

interface GetTimeRangeOpts {
  logger: Logger;
  queryDelaySettings?: RulesSettingsQueryDelayProperties;
  window?: string;
  forceNow?: string;
}

export interface GetTimeRangeResult {
  dateStart: string;
  dateEnd: string;
}

const isDate = (d: string | Date) => Object.prototype.toString.call(d) === '[object Date]';
const isValidDate = (d: string | Date) => isDate(d) && !isNaN((d as Date).valueOf());

export function convertToEsDateMath(nowDate: Date, window?: string) {
  if (!window) {
    return NOW_STRING;
  }

  if (window.substring(0, 3) === NOW_STRING) {
    // already in ES datemath format
    return window;
  }

  // check that window is valid duration
  try {
    parseDuration(window);
    return `${NOW_STRING}-${window}`;
  } catch (err) {
    // check whether the string is a valid date
    const windowDate = new Date(window);

    if (isValidDate(windowDate)) {
      const diffInMs = nowDate.getTime() - windowDate.getTime();
      const diffInMsString = diffInMs >= 0 ? `${diffInMs}` : `${diffInMs}`.substring(1);
      return diffInMs >= 0
        ? `${NOW_STRING}-${diffInMsString}ms`
        : `${NOW_STRING}+${diffInMsString}ms`;
    } else {
      throw new Error(
        i18n.translate('xpack.alerting.invalidWindowErrorMessage', {
          defaultMessage:
            'Invalid format for window: "{window}" - must be valid duration, valid date, or valid ES date math',
          values: {
            window,
          },
        })
      );
    }
  }
}

function parseDateMath(date: string, nowDate: Date) {
  const parsedDate = dateMath.parse(date, {
    forceNow: nowDate,
  });
  if (parsedDate == null) {
    throw new Error(
      i18n.translate('xpack.alerting.invalidDateErrorMessage', {
        defaultMessage: 'Failed to parse date math for date: "{date}"',
        values: {
          date,
        },
      })
    );
  }

  return parsedDate;
}

export function getTimeRange({
  logger,
  queryDelaySettings,
  forceNow,
  window,
}: GetTimeRangeOpts): GetTimeRangeResult {
  const nowDate = forceNow ? new Date(forceNow) : new Date();
  const esDateMathString: string = convertToEsDateMath(nowDate, window);

  if (queryDelaySettings) {
    logger.debug(`Adjusting rule query time range by ${queryDelaySettings.delay} seconds`);
  }

  const queryDelayString = queryDelaySettings ? `${queryDelaySettings.delay}s` : `0s`;

  const dateStart = parseDateMath(`${esDateMathString}-${queryDelayString}`, nowDate);
  const dateEnd = parseDateMath(`now-${queryDelayString}`, nowDate);

  return { dateStart: dateStart.utc().toISOString(), dateEnd: dateEnd.utc().toISOString() };
}
