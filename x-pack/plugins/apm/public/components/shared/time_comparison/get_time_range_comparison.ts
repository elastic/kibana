/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { EuiTheme } from 'src/plugins/kibana_react/common';
import { getDateDifference } from '../../../../common/utils/formatters';

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
  comparisonType?: string;
  start?: string;
  end?: string;
}) {
  if (!comparisonType || !start || !end) {
    return {};
  }

  const startDate = moment(start);
  const endDate = moment(end);

  const amountToSubtractPerType: Record<string, number> = {
    yesterday: oneDayInMilliseconds,
    week: oneWeekInMilliseconds,
    previousPeriod: getDateDifference({
      start: startDate,
      end: endDate,
      unitOfTime: 'milliseconds',
      precise: true,
    }),
  };

  const amountToSubtract = amountToSubtractPerType[comparisonType];
  if (amountToSubtract === undefined) {
    return {};
  }
  return {
    comparisonStart: startDate
      .subtract(amountToSubtract, 'milliseconds')
      .toISOString(),
    comparisonEnd: endDate
      .subtract(amountToSubtract, 'milliseconds')
      .toISOString(),
  };
}
