/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { AbsoluteTimeRange } from '../store/inputs/model';

export const getPreviousTimeRange = (dateRange: {
  to: string | number;
  from: string | number;
}): AbsoluteTimeRange => {
  const { from, to } = dateRange;
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

export const getFutureTimeRange = (dateRange: {
  to: string | number;
  from: string | number;
}): AbsoluteTimeRange => {
  const { from, to } = dateRange;
  const duration = moment(to).diff(moment(from));
  const previousStart = moment(from).add(duration).toISOString();
  const previousEnd = moment(to).add(duration).toISOString();
  return {
    kind: 'absolute',
    fromStr: undefined,
    toStr: undefined,
    from: previousStart,
    to: previousEnd,
  };
};
