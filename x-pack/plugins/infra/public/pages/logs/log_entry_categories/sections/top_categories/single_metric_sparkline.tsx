/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Chart, AreaSeries } from '@elastic/charts';
import { EUI_SPARKLINE_THEME_PARTIAL } from '@elastic/eui/dist/eui_charts_theme';

import { TimeRange } from '../../../../../../common/time';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { InfraClientStartDeps } from '../../../../../types';

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
  const { charts: { SharedChartSettings } } = useKibana<InfraClientStartDeps>().services;
  const xDomain = useMemo(
    () => ({
      max: timeRange.endTime,
      min: timeRange.startTime,
    }),
    [timeRange]
  );

  return (
    <Chart size={sparklineSize}>
      <SharedChartSettings showLegend={false} theme={EUI_SPARKLINE_THEME_PARTIAL} tooltip="none" xDomain={xDomain} />
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
