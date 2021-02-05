/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { EuiTheme } from 'src/plugins/kibana_react/common';
import { getDateDifference } from '../../../../common/utils/formatters';
import { useTheme } from '../../../hooks/use_theme';

export function getChartTheme(theme: EuiTheme) {
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

export function useTimeRangeComparison({
  comparisonType,
  start,
  end,
}: {
  comparisonType?: string;
  start?: string;
  end?: string;
}) {
  const theme = useTheme();
  if (!comparisonType || !start || !end) {
    return {};
  }

  const startDate = moment(start);
  const endDate = moment(end);

  const daysToSubtractPerType: Record<string, number> = {
    yesterday: 1,
    week: 7,
    previousPeriod: getDateDifference({
      start: startDate,
      end: endDate,
      unitOfTime: 'days',
    }),
  };

  const daysToSubtract = daysToSubtractPerType[comparisonType];
  if (!daysToSubtract) {
    return {};
  }
  return {
    comparisonStart: startDate.subtract(daysToSubtract, 'days').toISOString(),
    comparisonEnd: endDate.subtract(daysToSubtract, 'days').toISOString(),
    chartTheme: getChartTheme(theme),
  };
}
