/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { QUERY } from '../../../common/constants';

export const parseRelativeDate = (dateStr: string, options = {}) => {
  // We need this this parsing because if user selects This week or this date
  // That represents end date in future, if week or day is still in the middle
  // Uptime data can never be collected in future, so we will reset date to now
  // in That case. Example case we select this week range will be to='now/w' and from = 'now/w';

  const parsedDate = DateMath.parse(dateStr, options);
  const dateTimestamp = parsedDate?.valueOf() ?? 0;
  if (dateTimestamp > Date.now()) {
    return DateMath.parse('now');
  }
  return parsedDate;
};

export const getHistogramInterval = (
  dateRangeStart: string,
  dateRangeEnd: string,
  bucketCount?: number
): number => {
  const from = parseRelativeDate(dateRangeStart);

  // roundUp is required for relative date like now/w to get the end of the week
  const to = parseRelativeDate(dateRangeEnd, { roundUp: true });
  if (from === undefined) {
    throw Error('Invalid dateRangeStart value');
  }
  if (to === undefined) {
    throw Error('Invalid dateRangeEnd value');
  }
  const interval = Math.round(
    (to.valueOf() - from.valueOf()) / (bucketCount || QUERY.DEFAULT_BUCKET_COUNT)
  );

  // Interval can never be zero, if it's 0 we return at least 1ms interval
  return interval > 0 ? interval : 1;
};
