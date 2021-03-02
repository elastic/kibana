/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { EuiTheme } from 'src/plugins/kibana_react/common';
import { getDateDifference } from '../../../../common/utils/formatters';

export enum TimeRangeComparisonType {
  WeekBefore = 'week',
  DayBefore = 'day',
  PeriodBefore = 'period',
}

export function getComparisonChartTheme(theme: EuiTheme) {
  return {
    areaSeriesStyle: {
      area: {
        fill: theme.eui.euiColorLightestShade,
        visible: true,
        opacity: 1,
      },
      line: {
        stroke: theme.eui.euiColorMediumShade,
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
  comparisonType,
  start,
  end,
}: {
  comparisonType: TimeRangeComparisonType;
  start?: string;
  end?: string;
}) {
  if (!start || !end) {
    return {};
  }

  const startMoment = moment(start);
  const endMoment = moment(end);

  const startEpoch = startMoment.valueOf();
  const endEpoch = endMoment.valueOf();

  let diff: number;

  switch (comparisonType) {
    case TimeRangeComparisonType.DayBefore:
      diff = oneDayInMilliseconds;
      break;

    case TimeRangeComparisonType.WeekBefore:
      diff = oneWeekInMilliseconds;
      break;

    case TimeRangeComparisonType.PeriodBefore:
      diff = getDateDifference({
        start: startMoment,
        end: endMoment,
        unitOfTime: 'milliseconds',
        precise: true,
      });
      break;

    default:
      throw new Error('Unknown comparisonType');
  }

  return {
    comparisonStart: new Date(startEpoch - diff).toISOString(),
    comparisonEnd: new Date(endEpoch - diff).toISOString(),
  };
}
