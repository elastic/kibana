/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { Axis, Position, timeFormatter, niceTimeFormatByDay } from '@elastic/charts';
import type { LineChartPoint } from './event_rate_chart';

const dateFormatter = timeFormatter(niceTimeFormatByDay(3));

interface Props {
  chartData?: LineChartPoint[];
}

// round to 2dp
function tickFormatter(d: number): string {
  return (Math.round(d * 100) / 100).toString();
}

export const Axes: FC<Props> = ({ chartData }) => {
  const yDomain = getYRange(chartData);

  return (
    <Fragment>
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks={true}
        tickFormat={dateFormatter}
      />
      <Axis id="left" position={Position.Left} tickFormat={tickFormatter} domain={yDomain} />
    </Fragment>
  );
};

function getYRange(chartData?: LineChartPoint[]) {
  const fit = false;

  if (chartData === undefined) {
    return { fit, min: NaN, max: NaN };
  }

  if (chartData.length === 0) {
    return { min: 0, max: 0, fit };
  }

  let max: number = Number.MIN_VALUE;
  let min: number = Number.MAX_VALUE;
  chartData.forEach((r) => {
    max = Math.max(r.value, max);
    min = Math.min(r.value, min);
  });

  const padding = (max - min) * 0.1;
  max += padding;
  min -= padding;

  return {
    min,
    max,
    fit,
  };
}
