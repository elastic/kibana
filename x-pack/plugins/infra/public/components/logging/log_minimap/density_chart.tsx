/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleLinear, scaleTime } from 'd3-scale';
import { area, curveMonotoneY } from 'd3-shape';
import { max } from 'lodash';
import * as React from 'react';

import { euiStyled } from '../../../../../observability/public';
import { LogEntriesSummaryBucket } from '../../../../common/http_api';

interface DensityChartProps {
  buckets: LogEntriesSummaryBucket[];
  end: number;
  start: number;
  width: number;
  height: number;
  x: number;
}

export const DensityChart: React.FC<DensityChartProps> = ({
  buckets,
  start,
  end,
  width,
  height,
  x,
}) => {
  if (start >= end || height <= 0 || width <= 0 || buckets.length <= 0) {
    return null;
  }

  const yScale = scaleTime()
    .domain([start, end])
    .range([0, height]);

  const xMax = max(buckets.map(bucket => bucket.entriesCount)) || 0;
  const xScale = scaleLinear()
    .domain([0, xMax])
    .range([0, width]);

  // FIXME: path is not closed at the bottom.
  const path = area<LogEntriesSummaryBucket>()
    .x0(xScale(0))
    .x1(bucket => xScale(bucket.entriesCount))
    .y0(bucket => yScale(bucket.start))
    .y1(bucket => yScale(bucket.end))
    .curve(curveMonotoneY);
  const pathData = path(buckets);

  return (
    <g transform={`translate(${x}, 0)`}>
      <DensityChartPositiveBackground width={width} height={height} />
      <PositiveAreaPath d={pathData || ''} />
    </g>
  );
};

const DensityChartPositiveBackground = euiStyled.rect`
  fill: ${props =>
    props.theme.darkMode
      ? props.theme.eui.euiColorLightShade
      : props.theme.eui.euiColorLightestShade};
`;

const PositiveAreaPath = euiStyled.path`
  fill: ${props =>
    props.theme.darkMode
      ? props.theme.eui.euiColorMediumShade
      : props.theme.eui.euiColorLightShade};
`;
