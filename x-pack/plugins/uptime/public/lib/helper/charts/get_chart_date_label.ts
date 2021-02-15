/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isWithinCurrentDate } from './is_within_current_date';
import { getLabelFormat } from './get_label_format';
import { CHART_FORMAT_LIMITS } from '../../../../common/constants';

/**
 * Generates an appropriate date formatting string intended for the y-axis
 * label of timeseries charts. The function will return day/month values for shorter
 * time spans that cross the local date threshold, otherwise it estimates an appropriate
 * label for several different stops.
 * @param dateRangeStart the beginning of the date range
 * @param dateRangeEnd the end of the date range
 * @example a short range without crossing the date threshold
 * // Thu, 19 Jul 2001 17:50:00 GMT -> Thu, 19 Jul 2001 17:52:59 GMT
 * getChartDateLabel(995565000000, 995565179000); // returns 'mm'
 * @example a medium range that exceeds four days
 * // Sun, 15 Jul 2001 12:27:59 GMT -> Thu, 19 Jul 2001 17:52:59 GMT
 * getChartDateLabel(995200079000, 995565179000); // returns 'MM-dd'
 */
export const getChartDateLabel = (dateRangeStart: number, dateRangeEnd: number) => {
  if (dateRangeStart > dateRangeEnd) {
    throw Error(
      `Invalid date range. Received start value of ${dateRangeStart} and end value of ${dateRangeEnd}.`
    );
  }
  const delta = dateRangeEnd - dateRangeStart;
  let formatString = '';
  if (
    delta < CHART_FORMAT_LIMITS.THIRTY_SIX_HOURS &&
    !isWithinCurrentDate(dateRangeStart, dateRangeEnd)
  ) {
    formatString = 'MM-DD ';
  }
  return formatString + getLabelFormat(delta);
};
