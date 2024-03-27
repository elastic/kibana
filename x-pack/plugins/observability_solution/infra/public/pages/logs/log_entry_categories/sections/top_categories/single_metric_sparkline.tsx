/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Chart, Settings, AreaSeries, ScaleType, TooltipType, Tooltip } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useKibanaTimeZoneSetting } from '../../../../../hooks/use_kibana_time_zone_setting';
import { TimeRange } from '../../../../../../common/time';
import { useChartThemes } from '../../../../../hooks/use_chart_themes';

interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

const timestampAccessor = 'timestamp';
const valueAccessor = ['value'];
const sparklineSize = {
  height: 20,
  width: 100,
};

export const SingleMetricSparkline: React.FunctionComponent<{
  metric: TimeSeriesPoint[];
  timeRange: TimeRange;
}> = ({ metric, timeRange }) => {
  const timeZone = useKibanaTimeZoneSetting();
  const { baseTheme, sparklineTheme } = useChartThemes();

  const xDomain = useMemo(
    () => ({
      max: timeRange.endTime,
      min: timeRange.startTime,
    }),
    [timeRange]
  );

  return (
    <Chart size={sparklineSize}>
      <Tooltip type={TooltipType.None} />
      <Settings
        showLegend={false}
        theme={sparklineTheme}
        baseTheme={baseTheme}
        xDomain={xDomain}
        locale={i18n.getLocale()}
      />
      <AreaSeries
        id="metric"
        data={metric}
        xAccessor={timestampAccessor}
        xScaleType={ScaleType.Time}
        yAccessors={valueAccessor}
        timeZone={timeZone}
      />
    </Chart>
  );
};
