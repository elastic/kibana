/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleLinear, scaleTime } from 'd3-scale';
import { area, curveMonotoneY } from 'd3-shape';
import { max } from 'lodash';
import * as React from 'react';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { LogEntriesSummaryBucket } from '../../../../common/http_api';

interface DensityChartProps {
  buckets: LogEntriesSummaryBucket[];
  end: number;
  start: number;
  width: number;
  height: number;
}

export const DensityChart: React.FC<DensityChartProps> = ({
  buckets,
  start,
  end,
  width,
  height,
}) => {
  if (start >= end || height <= 0 || width <= 0 || buckets.length <= 0) {
    return null;
  }

  const yScale = scaleTime().domain([start, end]).range([0, height]);

  const xMax = max(buckets.map((bucket) => bucket.entriesCount)) || 0;
  const xScale = scaleLinear().domain([0, xMax]).range([0, width]);

  const path = area<LogEntriesSummaryBucket>()
    .x0(xScale(0))
    .x1((bucket) => xScale(bucket.entriesCount))
    .y0((bucket) => yScale(bucket.start))
    .y1((bucket) => yScale(bucket.end))
    .curve(curveMonotoneY);

  const firstBucket = buckets[0];
  const lastBucket = buckets[buckets.length - 1];
  const pathBuckets = [
    // Make sure the graph starts at the count of the first point
    { start, end: start, entriesCount: firstBucket.entriesCount },
    ...buckets,
    // Make sure the line ends at the height of the last point
    { start: lastBucket.end, end: lastBucket.end, entriesCount: lastBucket.entriesCount },
    // If the last point is not at the end of the minimap, make sure it doesn't extend indefinitely and goes to 0
    { start: end, end, entriesCount: 0 },
  ];
  const pathData = path(pathBuckets);

  return (
    <g>
      <DensityChartPositiveBackground width={width} height={height} />
      <PositiveAreaPath d={pathData || ''} />
    </g>
  );
};

const DensityChartPositiveBackground = euiStyled.rect`
  fill: ${(props) =>
    props.theme.darkMode
      ? props.theme.eui.euiColorLightShade
      : props.theme.eui.euiColorLightestShade};
`;

const PositiveAreaPath = euiStyled.path`
  fill: ${(props) =>
    props.theme.darkMode
      ? props.theme.eui.euiColorMediumShade
      : props.theme.eui.euiColorLightShade};
`;
