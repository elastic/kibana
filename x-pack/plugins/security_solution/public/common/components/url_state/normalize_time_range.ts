/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { URLTimeRange } from '../../store/inputs/model';
import { getTimeRangeSettings } from '../../utils/default_date_settings';
import { getMaybeDate } from '../formatted_date/maybe_date';

export const normalizeTimeRange = <
  T extends URLTimeRange | { to: string | number; from: string | number }
>(
  dateRange: T,
  uiSettings = true
): T => {
  const maybeTo = getMaybeDate(dateRange.to);
  const maybeFrom = getMaybeDate(dateRange.from);
  const { to: benchTo, from: benchFrom } = getTimeRangeSettings(uiSettings);
  const to: string = maybeTo.isValid() ? maybeTo.toISOString() : benchTo;
  const from: string = maybeFrom.isValid() ? maybeFrom.toISOString() : benchFrom;
  return {
    ...dateRange,
    to,
    from,
  };
};
