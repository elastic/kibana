/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PartialTheme } from '@elastic/charts';
import moment from 'moment';
import {
  TimeRangeComparisonType,
  TimeRangeComparisonEnum,
} from '../../../../common/runtime_types/comparison_type_rt';

export function getComparisonChartTheme(): PartialTheme {
  return {
    areaSeriesStyle: {
      area: {
        visible: true,
        opacity: 0.5,
      },
      line: {
        strokeWidth: 1,
        visible: true,
      },
      point: {
        visible: false,
      },
    },
  };
}

const oneDayInMilliseconds = moment.duration(1, 'day').asMilliseconds();
const oneWeekInMilliseconds = moment.duration(1, 'week').asMilliseconds();

export function getTimeRangeComparison({
  comparisonEnabled,
  comparisonType,
  start,
  end,
}: {
  comparisonEnabled?: boolean;
  comparisonType?: TimeRangeComparisonType;
  start?: string;
  end?: string;
}) {
  if (!comparisonEnabled || !comparisonType || !start || !end) {
    return {};
  }
  const startMoment = moment(start);
  const endMoment = moment(end);

  let diff: number;
  let offset: string;

  switch (comparisonType) {
    case TimeRangeComparisonEnum.DayBefore:
      diff = oneDayInMilliseconds;
      offset = '1d';
      break;
    case TimeRangeComparisonEnum.WeekBefore:
      diff = oneWeekInMilliseconds;
      offset = '1w';
      break;
    case TimeRangeComparisonEnum.PeriodBefore:
      diff = endMoment.diff(startMoment);
      offset = `${diff}ms`;
      break;
    default:
      throw new Error('Unknown comparisonType');
  }

  return {
    comparisonStart: startMoment.subtract(diff, 'ms').toISOString(),
    comparisonEnd: endMoment.subtract(diff, 'ms').toISOString(),
    offset,
  };
}
