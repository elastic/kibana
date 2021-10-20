/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { TimeRangeComparisonEnum } from '../../../../common/runtime_types/comparison_type_rt';
import { getDateDifference } from '../../../../common/utils/formatters';

export function getComparisonTypes({
  start,
  end,
}: {
  start?: string;
  end?: string;
}) {
  const momentStart = moment(start).startOf('second');
  const momentEnd = moment(end).startOf('second');

  const dateDiff = getDateDifference({
    start: momentStart,
    end: momentEnd,
    precise: true,
    unitOfTime: 'days',
  });

  // Less than or equals to one day
  if (dateDiff <= 1) {
    return [
      TimeRangeComparisonEnum.DayBefore,
      TimeRangeComparisonEnum.WeekBefore,
    ];
  }

  // Less than or equals to one week
  if (dateDiff <= 7) {
    return [TimeRangeComparisonEnum.WeekBefore];
  }
  // }

  // above one week or when rangeTo is not "now"
  return [TimeRangeComparisonEnum.PeriodBefore];
}
