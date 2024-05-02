/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { DateRange, Duration, toMomentUnitOfTime } from '../../domain/models';

export function computeTotalSlicesFromDateRange(dateRange: DateRange, timesliceWindow: Duration) {
  const dateRangeDurationInUnit = moment(dateRange.to).diff(
    dateRange.from,
    toMomentUnitOfTime(timesliceWindow.unit)
  );
  return Math.ceil(dateRangeDurationInUnit / timesliceWindow!.value);
}
