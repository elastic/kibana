/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getDateDifference } from '../../../../common/utils/formatters';
import { TimeRangeComparisonType } from './get_time_range_comparison';

export function getComparisonTypes({
  start,
  end,
}: {
  start?: string;
  end?: string;
}) {
  const momentStart = moment(start);
  const momentEnd = moment(end);

  const dateDiff = getDateDifference({
    start: momentStart,
    end: momentEnd,
    unitOfTime: 'days',
    precise: true,
  });

  // Less than or equals to one day
  if (dateDiff <= 1) {
    return [
      TimeRangeComparisonType.DayBefore,
      TimeRangeComparisonType.WeekBefore,
    ];
  }

  // Less than or equals to one week
  if (dateDiff <= 7) {
    return [TimeRangeComparisonType.WeekBefore];
  }
  // }

  // above one week or when rangeTo is not "now"
  return [TimeRangeComparisonType.PeriodBefore];
}
