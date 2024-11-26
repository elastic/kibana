/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';

export const DEFAULT_DATE_RANGE_OPTIONS = Object.freeze({
  autoRefreshOptions: {
    enabled: false,
    duration: 10000,
  },
  startDate: 'now-24h/h',
  endDate: 'now',
  maxDate: 'now+1s',
  minDate: 'now-9d',
  recentlyUsedDateRanges: [],
});

export const momentDateParser = (date: string) => dateMath.parse(date);
export const transformToUTCtime = ({
  start,
  end,
  isISOString = false,
}: {
  start: string;
  end: string;
  isISOString?: boolean;
}) => {
  const utcOffset = momentDateParser(start)?.utcOffset() ?? 0;
  const utcStart = momentDateParser(start)?.utc().add(utcOffset, 'm');
  const utcEnd = momentDateParser(end)?.utc().add(utcOffset, 'm');
  return {
    start: isISOString ? utcStart?.toISOString() : momentDateParser(start),
    end: isISOString ? utcEnd?.toISOString() : momentDateParser(end),
  };
};

export const validateDateRangeWithinMinMax = (start: string, end: string): boolean => {
  const startDate = momentDateParser(start);
  const endDate = momentDateParser(end);

  if (!startDate || !endDate) {
    return false;
  }
  const minDate = momentDateParser(DEFAULT_DATE_RANGE_OPTIONS.minDate);
  const maxDate = momentDateParser(DEFAULT_DATE_RANGE_OPTIONS.maxDate);
  return (
    startDate.isSameOrAfter(minDate, 's') &&
    endDate.isSameOrBefore(maxDate, 's') &&
    startDate <= endDate
  );
};
