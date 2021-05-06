/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import moment, { Duration } from 'moment';
import type { TimerangeInput } from '../../../common/search_strategy';

export type ParseTimeRange = (
  timeRange: TimerangeInput
) => { timeRangeAdjusted: TimerangeInput | undefined; duration: Duration | undefined };

export const adjustTimeRange: ParseTimeRange = (timerange) => {
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
