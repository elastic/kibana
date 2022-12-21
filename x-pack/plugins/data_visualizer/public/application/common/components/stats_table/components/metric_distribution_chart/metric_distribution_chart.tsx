/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  Position,
  ScaleType,
  Settings,
  TooltipValue,
  TooltipValueFormatter,
} from '@elastic/charts';

import { MetricDistributionChartTooltipHeader } from './metric_distribution_chart_tooltip_header';
import { kibanaFieldFormat } from '../../../utils';
import { useDataVizChartTheme } from '../../hooks';

interface ChartTooltipValue extends TooltipValue {
  skipHeader?: boolean;
}

export interface MetricDistributionChartData {
  x: number;
  y: number;
  dataMin: number;
  dataMax: number;
  percent: number;
}

interface Props {
  width: number;
  height: number;
  chartData: MetricDistributionChartData[];
  fieldFormat?: any; // Kibana formatter for field being viewed
  hideXAxis?: boolean;
}

const SPEC_ID = 'metric_distribution';

export const MetricDistributionChart: FC<Props> = ({
  width,
  height,
  chartData,
  fieldFormat,
  hideXAxis,
}) => {
  // This value is shown to label the y axis values in the tooltip.
  // Ideally we wouldn't show these values at all in the tooltip,
  // but this is not yet possible with Elastic charts.
  const seriesName = i18n.translate(
    'xpack.dataVisualizer.dataGrid.field.metricDistributionChart.seriesName',
    {
      defaultMessage: 'distribution',
    }
  );

  const theme = useDataVizChartTheme();

  const headerFormatter: TooltipValueFormatter = (tooltipData: ChartTooltipValue) => {
    const xValue = tooltipData.value;
    const chartPoint: MetricDistributionChartData | undefined = chartData.find(
      (data) => data.x === xValue
    );

    return (
      <MetricDistributionChartTooltipHeader
        chartPoint={chartPoint}
        maxWidth={width}
        fieldFormat={fieldFormat}
      />
    );
  };

  return (
    <div
      data-test-subj="dataVisualizerFieldDataMetricDistributionChart"
      className="dataGridChart__histogram"
    >
      <Chart size={{ width, height }}>
        <Settings theme={theme} tooltip={{ headerFormatter }} />
        <Axis
          id="bottom"
          position={Position.Bottom}
          tickFormat={(d) => kibanaFieldFormat(d, fieldFormat)}
          hide={hideXAxis === true}
        />
        <Axis id="left" position={Position.Left} tickFormat={(d) => d.toFixed(3)} hide={true} />
        <AreaSeries
          id={SPEC_ID}
          name={seriesName}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={
            chartData.length > 0 ? chartData : [{ x: 0, y: 0, dataMin: 0, dataMax: 0, percent: 0 }]
          }
          curve={CurveType.CURVE_STEP_AFTER}
        />
      </Chart>
    </div>
  );
};
