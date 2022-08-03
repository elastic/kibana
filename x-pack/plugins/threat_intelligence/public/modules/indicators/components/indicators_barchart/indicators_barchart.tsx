/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiThemeProvider } from '@elastic/eui';
import { TimeRangeBounds } from '@kbn/data-plugin/common';
import { barChartTimeAxisLabelFormatter } from '../../../../common/utils/dates';
import { ChartSeries } from '../../hooks/use_aggregated_indicators';

const ID = 'tiIndicator';
const DEFAULT_CHART_HEIGHT = '200px';
const DEFAULT_CHART_WIDTH = '100%';

export interface IndicatorsBarChartProps {
  indicators: ChartSeries[];
  dateRange: TimeRangeBounds;
  height?: string;
}

export const IndicatorsBarChart: VFC<IndicatorsBarChartProps> = ({
  indicators,
  dateRange,
  height = DEFAULT_CHART_HEIGHT,
}) => {
  return (
    <EuiThemeProvider>
      <Chart size={{ width: DEFAULT_CHART_WIDTH, height }}>
        <Settings showLegend showLegendExtra legendPosition={Position.Right} />
        <Axis
          id={`${ID}TimeAxis`}
          position={Position.Bottom}
          labelFormat={barChartTimeAxisLabelFormatter(dateRange)}
        />
        <Axis id={`${ID}IndicatorAxis`} position={Position.Left} />
        <BarSeries
          id={`${ID}BarChart`}
          name="Indicators"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          stackAccessors={['x']}
          splitSeriesAccessors={['g']}
          data={indicators}
        />
      </Chart>
    </EuiThemeProvider>
  );
};
