/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment, { Duration } from 'moment';
import type { TimerangeInput } from '../../../common/search_strategy';

export interface TimeRangeAdjusted {
  timeRangeAdjusted: TimerangeInput | undefined;
  duration: Duration | undefined;
}

/**
 * Adjusts a given timerange by rounding the "from" down by an hour and returning
 * the duration between "to" and "from". The duration is typically analyzed to determine
 * if the adjustment should be made or not. Although we check "to" and use "to" for duration
 * we are careful to still return "to: timerange.to", which is the original input to be careful
 * about accidental bugs from trying to over parse or change relative date time ranges.
 * @param timerange The timeRange to determine if we adjust or not
 * @returns The time input adjustment and a duration
 */
export const adjustTimeRange = (timerange: TimerangeInput): TimeRangeAdjusted => {
  const from = dateMath.parse(timerange.from);
  const to = dateMath.parse(timerange.to);
  if (from == null || to == null) {
    return { timeRangeAdjusted: undefined, duration: undefined };
  } else {
    const newTimerange: TimerangeInput = {
      from: moment(from).startOf('hour').toISOString(),
      to: timerange.to,
      interval: timerange.interval,
    };
    const duration = moment.duration(to.diff(from));
    return { timeRangeAdjusted: newTimerange, duration };
  }
};
