/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { Chart, Settings, AreaSeries } from '@elastic/charts';
import {
  EUI_CHARTS_THEME_LIGHT,
  EUI_SPARKLINE_THEME_PARTIAL,
  EUI_CHARTS_THEME_DARK,
} from '@elastic/eui/dist/eui_charts_theme';

import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';
import { TimeRange } from '../../../../../../common/http_api/shared';

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
  const [isDarkMode] = useKibanaUiSetting('theme:darkMode');

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
      <Settings showLegend={false} theme={theme} tooltip="none" xDomain={xDomain} />
      <AreaSeries
        data={metric}
        id="metric"
        xAccessor={timestampAccessor}
        xScaleType="time"
        yAccessors={valueAccessor}
      />
    </Chart>
  );
};
