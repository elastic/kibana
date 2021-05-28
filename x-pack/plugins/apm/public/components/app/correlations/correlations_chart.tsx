/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  AnnotationDomainType,
  Chart,
  CurveType,
  Settings,
  Axis,
  ScaleType,
  Position,
  AreaSeries,
  RecursivePartial,
  AxisStyle,
  PartialTheme,
  BarSeriesSpec,
  LineAnnotation,
  LineAnnotationDatum,
} from '@elastic/charts';

import euiVars from '@elastic/eui/dist/eui_theme_light.json';

import { EuiSpacer } from '@elastic/eui';

const { euiColorMediumShade } = euiVars;
const axisColor = euiColorMediumShade;

const axes: RecursivePartial<AxisStyle> = {
  axisLine: {
    stroke: axisColor,
  },
  tickLabel: {
    fontSize: 10,
    fill: axisColor,
    padding: 0,
  },
  tickLine: {
    stroke: axisColor,
    size: 5,
  },
  gridLine: {
    horizontal: {
      dash: [1, 2],
    },
    vertical: {
      strokeWidth: 1,
    },
  },
};
const theme: PartialTheme = {
  axes,
  legend: {
    spacingBuffer: 100,
  },
  areaSeriesStyle: {
    line: {
      visible: false,
    },
  },
};

const barSeriesSpec: Partial<BarSeriesSpec> = {
  xAccessor: 'key',
  yAccessors: ['doc_count_full', 'doc_count'],
};

interface CorrelationsChartProps {
  field: string;
  value: string;
  histogram: Array<{ key: string; doc_count: number; doc_count_full: number }>;
  markerValue: number;
  markerPercentile: number;
}

const annotationsStyle = {
  line: {
    strokeWidth: 1,
    stroke: 'gray',
    opacity: 0.8,
  },
  details: {
    fontSize: 8,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    fill: 'gray',
    padding: 0,
  },
};

export function CorrelationsChart({
  field,
  value,
  histogram,
  markerValue,
  markerPercentile,
}: CorrelationsChartProps) {
  const annotationsDataValues: LineAnnotationDatum[] = [
    { dataValue: markerValue, details: `${markerPercentile}th percentile` },
  ];

  return (
    <div
      style={{ width: '610px', overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      <small
        style={{
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >{`${field}:${value}`}</small>
      <Chart
        size={{
          width: '600px',
          height: '300px',
        }}
      >
        <Settings rotation={0} theme={theme} showLegend={false} />

        <LineAnnotation
          id="annotation_1"
          domainType={AnnotationDomainType.XDomain}
          dataValues={annotationsDataValues}
          style={annotationsStyle}
          marker={`${markerPercentile}p`}
          markerPosition={'top'}
        />

        <Axis id="x-axis" title="" position={Position.Bottom} />
        <Axis id="y-axis" title="" position={Position.Left} />
        <AreaSeries
          id="magnitude"
          xScaleType={ScaleType.Log}
          yScaleType={ScaleType.Log}
          data={histogram}
          curve={CurveType.CURVE_STEP}
          {...barSeriesSpec}
        />
      </Chart>
      <EuiSpacer size="s" />
    </div>
  );
}
