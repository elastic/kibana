/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { normalizeTimeRange } from './normalize_time_range';
import type { AbsoluteTimeRange, URLTimeRange } from '../store/inputs/model';

export const getPreviousTimeRange = <
  T extends URLTimeRange | { to: string | number; from: string | number }
>(
  dateRange: T,
  uiSettings = true
): AbsoluteTimeRange => {
  const { from, to } = normalizeTimeRange(dateRange, uiSettings);
  const duration = moment(to).diff(moment(from));
  const previousStart = moment(from).subtract(duration).toISOString();
  const previousEnd = moment(to).subtract(duration).toISOString();
  return {
    kind: 'absolute',
    fromStr: undefined,
    toStr: undefined,
    from: previousStart,
    to: previousEnd,
  };
};
