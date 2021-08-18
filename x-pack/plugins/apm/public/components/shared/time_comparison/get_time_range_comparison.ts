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
        fill: theme.eui.euiColorLightShade,
        visible: true,
        opacity: 0.5,
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

  const startEpoch = startMoment.valueOf();
  const endEpoch = endMoment.valueOf();

  let diff: number;
  let offset: string;

  switch (comparisonType) {
    case TimeRangeComparisonType.DayBefore:
      diff = oneDayInMilliseconds;
      offset = '1d';
      break;

    case TimeRangeComparisonType.WeekBefore:
      diff = oneWeekInMilliseconds;
      offset = '1w';
      break;

    case TimeRangeComparisonType.PeriodBefore:
      diff = getDateDifference({
        start: startMoment,
        end: endMoment,
        unitOfTime: 'milliseconds',
        precise: true,
      });
      offset = `${diff}ms`;
      break;

    default:
      throw new Error('Unknown comparisonType');
  }

  return {
    comparisonStart: new Date(startEpoch - diff).toISOString(),
    comparisonEnd: new Date(endEpoch - diff).toISOString(),
    offset,
  };
}
