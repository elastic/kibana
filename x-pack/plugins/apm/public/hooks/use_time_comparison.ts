/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

export function useTimeSeriesComparison({
  start,
  end,
  timeComparison,
}: {
  start: string;
  end: string;
  timeComparison?: 'yesterday' | 'week' | undefined;
}) {
  if (!timeComparison) {
    return;
  }
  const startDate = moment(start);
  const endDate = moment(end);

  const amount = timeComparison === 'yesterday' ? 1 : 7;

  return {
    start: startDate.subtract(amount, 'days').toISOString(),
    end: endDate.subtract(amount, 'days').toISOString(),
  };
}
