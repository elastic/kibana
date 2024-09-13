/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { first, get } from 'lodash';
import numeral from '@elastic/numeral';
import { getColor } from './get_color';
import { TimeseriesVisualization } from './timeseries_visualization';

function formatTicksFor(series, formatProperty = 'metric.format') {
  const format = get(series, formatProperty, '0,0.0');
  const units = get(series, 'metric.units', '');

  return function formatTicks(val) {
    let formatted = numeral(val).format(format);

    // numeral write 'B' as the actual size (e.g., 'MB')
    if (units !== 'B' && units !== '') {
      formatted += ' ' + units;
    }

    return formatted;
  };
}

export function MonitoringTimeseries({ series, onBrush }) {
  const dataset = series.map((s, index) => {
    return {
      color: getColor(s.metric.app, index),
      data: s.data,
      label: s.metric.label,
    };
  });
  const firstSeries = first(series);
  const timeRange = get(firstSeries, 'timeRange');
  const formatTicks = formatTicksFor(firstSeries);
  const legendFormatter =
    firstSeries.metric.legendFormat && formatTicksFor(firstSeries, 'metric.legendFormat');

  return (
    <TimeseriesVisualization
      series={dataset}
      timeRange={timeRange}
      tickFormatter={formatTicks}
      legendFormatter={legendFormatter}
      onBrush={onBrush}
    />
  );
}
