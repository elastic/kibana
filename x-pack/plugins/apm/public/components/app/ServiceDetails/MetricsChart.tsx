/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { GenericMetricsChart } from '../../../../server/lib/metrics/transform_metrics_chart';
// @ts-ignore
import CustomPlot from '../../shared/charts/CustomPlot';
import { HoverXHandlers } from '../../shared/charts/SyncChartGroup';
import {
  asDynamicBytes,
  asPercent,
  getFixedByteFormatter,
  asDecimal
} from '../../../utils/formatters';
import { Coordinate } from '../../../../typings/timeseries';

interface Props {
  chart: GenericMetricsChart;
  hoverXHandlers: HoverXHandlers;
}

export function MetricsChart({ chart, hoverXHandlers }: Props) {
  const formatYValue = getYTickFormatter(chart);
  const formatTooltip = getTooltipFormatter(chart);

  const transformedSeries = chart.series.map(series => ({
    ...series,
    legendValue: formatYValue(series.overallValue)
  }));

  return (
    <React.Fragment>
      <EuiTitle size="xs">
        <span>{chart.title}</span>
      </EuiTitle>
      <CustomPlot
        {...hoverXHandlers}
        noHits={chart.totalHits === 0}
        series={transformedSeries}
        tickFormatY={formatYValue}
        formatTooltipValue={formatTooltip}
        yMax={chart.yUnit === 'percent' ? 1 : 'max'}
      />
    </React.Fragment>
  );
}

function getYTickFormatter(chart: GenericMetricsChart) {
  switch (chart.yUnit) {
    case 'bytes': {
      const max = Math.max(
        ...chart.series.flatMap(series =>
          series.data.map(coord => coord.y || 0)
        )
      );
      return getFixedByteFormatter(max);
    }
    case 'percent': {
      return (y: number | null) => asPercent(y || 0, 1);
    }
    default: {
      return (y: number | null) => (y === null ? y : asDecimal(y));
    }
  }
}

function getTooltipFormatter({ yUnit }: GenericMetricsChart) {
  switch (yUnit) {
    case 'bytes': {
      return (c: Coordinate) => asDynamicBytes(c.y);
    }
    case 'percent': {
      return (c: Coordinate) => asPercent(c.y || 0, 1);
    }
    default: {
      return (c: Coordinate) => (c.y === null ? c.y : asDecimal(c.y));
    }
  }
}
