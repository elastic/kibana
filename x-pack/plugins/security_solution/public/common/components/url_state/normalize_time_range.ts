/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { URLTimeRange } from '../../store/inputs/model';
import { getMaybeDate } from '../formatted_date/maybe_date';

export const normalizeTimeRange = <T extends URLTimeRange>(dateRange: T): T => {
  const maybeTo = getMaybeDate(dateRange.to);
  const maybeFrom = getMaybeDate(dateRange.from);
  const to: number = maybeTo.isValid() ? maybeTo.valueOf() : Number(dateRange.to);
  const from: number = maybeFrom.isValid() ? maybeFrom.valueOf() : Number(dateRange.from);
  return {
    ...dateRange,
    to,
    from,
  };
};
