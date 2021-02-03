/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { getDateDifference } from '../../../../common/utils/formatters';

export function getTimeRangeComparison({
  comparisonType,
  start,
  end,
}: {
  comparisonType?: string;
  start?: string;
  end?: string;
}) {
  if (!comparisonType || !start || !end) {
    return {};
  }

  const startDate = moment(start);
  const endDate = moment(end);

  const daysToSubtractPerType: Record<string, number> = {
    yesterday: 1,
    week: 7,
    previousPeriod: getDateDifference(startDate, endDate, 'days'),
  };

  const daysToSubtract = daysToSubtractPerType[comparisonType];
  if (!daysToSubtract) {
    return {};
  }
  return {
    comparisonStart: startDate.subtract(daysToSubtract, 'days').toISOString(),
    comparisonEnd: endDate.subtract(daysToSubtract, 'days').toISOString(),
  };
}
