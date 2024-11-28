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

type MomentDate = Exclude<ReturnType<typeof dateMath.parse>, undefined>;

export const parseToMoment = (date: string): undefined | MomentDate => dateMath.parse(date);
export const transformToUTCtime = ({
  start,
  end,
  isISOString = false,
}: {
  start: string;
  end: string;
  isISOString?: boolean;
}) => {
  const utcOffset = parseToMoment(start)?.utcOffset() ?? 0;
  const utcStart = parseToMoment(start)?.utc().add(utcOffset, 'm');
  const utcEnd = parseToMoment(end)?.utc().add(utcOffset, 'm');
  return {
    start: isISOString ? utcStart?.toISOString() : parseToMoment(start),
    end: isISOString ? utcEnd?.toISOString() : parseToMoment(end),
  };
};

export const isDateRangeValid = ({ start, end }: { start: string; end: string }): boolean => {
  const startDate = parseToMoment(start);
  const endDate = parseToMoment(end);

  if (!startDate || !endDate) {
    return false;
  }
  const minDate = parseToMoment(DEFAULT_DATE_RANGE_OPTIONS.minDate);
  const maxDate = parseToMoment(DEFAULT_DATE_RANGE_OPTIONS.maxDate);
  return (
    startDate.isSameOrAfter(minDate, 's') &&
    endDate.isSameOrBefore(maxDate, 's') &&
    startDate <= endDate
  );
};
