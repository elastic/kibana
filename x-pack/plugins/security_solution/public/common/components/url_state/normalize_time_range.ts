/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';

import { URLTimeRange } from '../../store/inputs/model';
import { getMaybeDate } from '../formatted_date/maybe_date';

export const normalizeTimeRange = <T extends URLTimeRange>(dateRange: T): T => {
  const maybeTo = getMaybeDate(dateRange.to);
  const maybeFrom = getMaybeDate(dateRange.from);
  const to: string = maybeTo.isValid()
    ? maybeTo.toISOString()
    : dateMath.parse('now').toISOString();
  const from: string = maybeFrom.isValid()
    ? maybeFrom.toISOString()
    : dateMath.parse('now-24h').toISOString();
  return {
    ...dateRange,
    to,
    from,
  };
};
