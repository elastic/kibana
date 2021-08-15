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
  LineAnnotation,
  LineAnnotationDatum,
} from '@elastic/charts';

import euiVars from '@elastic/eui/dist/eui_theme_light.json';

import { i18n } from '@kbn/i18n';

import {
  getDurationUnitKey,
  getUnitLabelAndConvertedValue,
} from '../../../../common/utils/formatters';

import { HistogramItem } from '../../../../common/search_strategies/correlations/types';

import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';

import { ChartContainer } from '../../shared/charts/chart_container';

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
  field?: string;
  value?: string;
  histogram?: HistogramItem[];
  markerValue: number;
  markerPercentile: number;
  overallHistogram?: HistogramItem[];
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

const CHART_PLACEHOLDER_VALUE = 0.0001;

// Elastic charts will show any lone bin (i.e. a populated bin followed by empty bin)
// as a circular marker instead of a bar
// This provides a workaround by making the next bin not empty
export const replaceHistogramDotsWithBars = (
  originalHistogram: HistogramItem[] | undefined
) => {
  if (originalHistogram === undefined) return;
  const histogram = [...originalHistogram];
  {
    for (let i = 0; i < histogram.length - 1; i++) {
      if (
        histogram[i].doc_count > 0 &&
        histogram[i].doc_count !== CHART_PLACEHOLDER_VALUE &&
        histogram[i + 1].doc_count === 0
      ) {
        histogram[i + 1].doc_count = CHART_PLACEHOLDER_VALUE;
      }
    }
    return histogram;
  }
};

export function CorrelationsChart({
  field,
  value,
  histogram: originalHistogram,
  markerValue,
  markerPercentile,
  overallHistogram,
}: CorrelationsChartProps) {
  const euiTheme = useTheme();

  const annotationsDataValues: LineAnnotationDatum[] = [
    {
      dataValue: markerValue,
      details: i18n.translate(
        'xpack.apm.correlations.latency.chart.percentileMarkerLabel',
        {
          defaultMessage: '{markerPercentile}th percentile',
          values: {
            markerPercentile,
          },
        }
      ),
    },
  ];

  // This will create y axis ticks for 1, 10, 100, 1000 ...
  const yMax =
    Math.max(...(overallHistogram ?? []).map((d) => d.doc_count)) ?? 0;
  const yTicks = Math.ceil(Math.log10(yMax));
  const yAxisDomain = {
    min: 0.9,
    max: Math.pow(10, yTicks),
  };

  const histogram = replaceHistogramDotsWithBars(originalHistogram);

  return (
    <div
      data-test-subj="apmCorrelationsChart"
      style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      <ChartContainer
        height={250}
        hasData={Array.isArray(overallHistogram) && overallHistogram.length > 0}
        status={
          Array.isArray(overallHistogram)
            ? FETCH_STATUS.SUCCESS
            : FETCH_STATUS.LOADING
        }
      >
        <Chart>
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
            tickFormat={(d) => {
              const unit = getDurationUnitKey(d, 1);
              const converted = getUnitLabelAndConvertedValue(unit, d);
              const convertedValueParts = converted.convertedValue.split('.');
              const convertedValue =
                convertedValueParts.length === 2 &&
                convertedValueParts[1] === '0'
                  ? convertedValueParts[0]
                  : converted.convertedValue;
              return `${convertedValue}${converted.unitLabel}`;
            }}
          />
          <Axis
            id="y-axis"
            domain={yAxisDomain}
            title={i18n.translate(
              'xpack.apm.correlations.latency.chart.numberOfTransactionsLabel',
              { defaultMessage: '# transactions' }
            )}
            position={Position.Left}
            ticks={yTicks}
          />
          <AreaSeries
            id={i18n.translate(
              'xpack.apm.correlations.latency.chart.overallLatencyDistributionLabel',
              { defaultMessage: 'Overall latency distribution' }
            )}
            xScaleType={ScaleType.Log}
            yScaleType={ScaleType.Log}
            data={overallHistogram ?? []}
            curve={CurveType.CURVE_STEP_AFTER}
            xAccessor="key"
            yAccessors={['doc_count']}
            color={euiTheme.eui.euiColorVis1}
            fit="lookahead"
          />
          {Array.isArray(histogram) &&
            field !== undefined &&
            value !== undefined && (
              <AreaSeries
                id={`${field}:${value}`}
                xScaleType={ScaleType.Log}
                yScaleType={ScaleType.Log}
                data={histogram}
                curve={CurveType.CURVE_STEP_AFTER}
                xAccessor="key"
                yAccessors={['doc_count']}
                color={euiTheme.eui.euiColorVis2}
              />
            )}
        </Chart>
      </ChartContainer>
    </div>
  );
}
