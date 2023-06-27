/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Chart, Settings, AreaSeries, ScaleType, TooltipType, Tooltip } from '@elastic/charts';
import {
  EUI_CHARTS_THEME_LIGHT,
  EUI_SPARKLINE_THEME_PARTIAL,
  EUI_CHARTS_THEME_DARK,
} from '@elastic/eui/dist/eui_charts_theme';
import { useIsDarkMode } from '../../../../../hooks/use_is_dark_mode';
import { useKibanaTimeZoneSetting } from '../../../../../hooks/use_kibana_time_zone_setting';
import { TimeRange } from '../../../../../../common/time';

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
  const isDarkMode = useIsDarkMode();
  const timeZone = useKibanaTimeZoneSetting();

  const theme = useMemo(
    () => [
      // localThemeOverride,
      EUI_SPARKLINE_THEME_PARTIAL,
      isDarkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme,
    ],
    [isDarkMode]
  );

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
      <Settings showLegend={false} theme={theme} xDomain={xDomain} />
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
