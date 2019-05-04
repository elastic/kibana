/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { GenericMetricsChart } from '../../../../server/lib/metrics/types';
// @ts-ignore
import CustomPlot from '../../shared/charts/CustomPlot';
import { HoverXHandlers } from '../../shared/charts/SyncChartGroup';
import { StringMap } from '../../../../typings/common';
import { asPercent } from '../../../utils/formatters';
import { Coordinate, YUnit } from '../../../../typings/timeseries';

interface Props {
  chart: GenericMetricsChart;
  hoverXHandlers: HoverXHandlers;
}

function asBytesGB(value: number | null) {
  if (value === null || isNaN(value)) {
    return '';
  }
  return `${Math.floor(value / 1e7) / 100} GB`;
}

function getYTickFormatter(unit: YUnit) {
  switch (unit) {
    case 'bytes-GB': {
      return asBytesGB;
    }
    case 'percent': {
      return (y: number | null) => asPercent(y || 0, 1);
    }
    default: {
      return (y: number | null) => y;
    }
  }
}

function getTooltipFormatter(unit: YUnit) {
  switch (unit) {
    case 'bytes-GB': {
      return (c: Coordinate) => asBytesGB(c.y);
    }
    case 'percent': {
      return (c: Coordinate) => asPercent(c.y || 0, 1);
    }
    default: {
      return (c: Coordinate) => c.y;
    }
  }
}

export function MetricsChart({ chart, hoverXHandlers }: Props) {
  const chartProps: StringMap<any> = {};
  if (chart.yUnit === 'percent') {
    chartProps.yMax = 1;
  }

  const formatYValue = getYTickFormatter(chart.yUnit);
  const formatTooltip = getTooltipFormatter(chart.yUnit);

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
        {...chartProps}
      />
    </React.Fragment>
  );
}
