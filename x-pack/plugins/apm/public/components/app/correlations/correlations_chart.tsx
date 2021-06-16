/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { max } from 'd3-array';

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
  LineAnnotation,
  LineAnnotationDatum,
} from '@elastic/charts';

import euiVars from '@elastic/eui/dist/eui_theme_light.json';

import { EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { getDurationFormatter } from '../../../../common/utils/formatters';

import { useTheme } from '../../../hooks/use_theme';
import { HistogramItem } from '../../../../common/search_strategies/correlations/types';

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
const chartTheme: PartialTheme = {
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

interface CorrelationsChartProps {
  field: string;
  value: string;
  histogram: HistogramItem[];
  markerValue: number;
  markerPercentile: number;
  overallHistogram: HistogramItem[];
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
  overallHistogram,
}: CorrelationsChartProps) {
  const euiTheme = useTheme();

  if (!Array.isArray(overallHistogram)) return;
  const annotationsDataValues: LineAnnotationDatum[] = [
    { dataValue: markerValue, details: `${markerPercentile}th percentile` },
  ];

  const xMax = max(overallHistogram.map((d) => d.key)) ?? 0;
  const durationFormatter = getDurationFormatter(xMax);

  return (
    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <Chart
        size={{
          height: '250px',
        }}
      >
        <Settings
          rotation={0}
          theme={chartTheme}
          showLegend
          legendPosition={Position.Bottom}
        />

        <LineAnnotation
          id="annotation_1"
          domainType={AnnotationDomainType.XDomain}
          dataValues={annotationsDataValues}
          style={annotationsStyle}
          marker={`${markerPercentile}p`}
          markerPosition={'top'}
        />

        <Axis
          id="x-axis"
          title=""
          position={Position.Bottom}
          tickFormat={(d) => durationFormatter(d).formatted}
        />
        <Axis id="y-axis" title="" position={Position.Left} />
        <AreaSeries
          id={i18n.translate(
            'xpack.apm.correlations.latency.chart.overallLatencyDistributionLabel',
            { defaultMessage: 'Overall latency distribution' }
          )}
          xScaleType={ScaleType.Log}
          yScaleType={ScaleType.Log}
          data={overallHistogram}
          curve={CurveType.CURVE_STEP_AFTER}
          xAccessor="key"
          yAccessors={['doc_count']}
          color={euiTheme.eui.euiColorVis1}
        />

        <AreaSeries
          id={i18n.translate(
            'xpack.apm.correlations.latency.chart.overallLatencyDistributionLabel',
            { defaultMessage: 'Overall latency distribution' }
          )}
          xScaleType={ScaleType.Log}
          yScaleType={ScaleType.Log}
          data={overallHistogram}
          curve={CurveType.CURVE_STEP_AFTER}
          xAccessor="key"
          yAccessors={['doc_count']}
          color={euiTheme.eui.euiColorVis1}
        />
        {histogram ? (
          <AreaSeries
            id={i18n.translate(
              'xpack.apm.correlations.latency.chart.selectedTermLatencyDistributionLabel',
              {
                defaultMessage: '{fieldName}:{fieldValue}',
                values: {
                  fieldName: field,
                  fieldValue: value,
                },
              }
            )}
            xScaleType={ScaleType.Log}
            yScaleType={ScaleType.Log}
            data={histogram}
            curve={CurveType.CURVE_STEP_AFTER}
            xAccessor="key"
            yAccessors={['doc_count']}
            color={euiTheme.eui.euiColorVis2}
          />
        ) : null}
      </Chart>
      <EuiSpacer size="s" />
    </div>
  );
}
