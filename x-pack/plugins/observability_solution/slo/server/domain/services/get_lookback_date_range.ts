/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Duration, toMomentUnitOfTime } from '../models';
export function getLookbackDateRange(
  startedAt: Date,
  duration: Duration,
  delayInSeconds = 0
): { from: Date; to: Date } {
  const unit = toMomentUnitOfTime(duration.unit);
  const now = moment(startedAt).subtract(delayInSeconds, 'seconds').startOf('minute');
  const from = now.clone().subtract(duration.value, unit).startOf('minute');

  return {
    from: from.toDate(),
    to: now.toDate(),
  };
}
