/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { flatten } from 'lodash';

import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  BrushEndListener,
  Chart,
  CurveType,
  LineAnnotation,
  LineAnnotationDatum,
  LineAnnotationStyle,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  TickFormatter,
} from '@elastic/charts';

import { euiPaletteColorBlind } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useChartTheme } from '@kbn/observability-shared-plugin/public';

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import type { HistogramItem } from '../../../../../common/correlations/types';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../../common/correlations/constants';

import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';

import { ChartContainer } from '../chart_container';

const NUMBER_OF_TRANSACTIONS_LABEL = i18n.translate(
  'xpack.apm.durationDistribution.chart.numberOfTransactionsLabel',
  { defaultMessage: 'Transactions' }
);

const NUMBER_OF_SPANS_LABEL = i18n.translate(
  'xpack.apm.durationDistribution.chart.numberOfSpansLabel',
  { defaultMessage: 'Spans' }
);

export interface DurationDistributionChartData {
  id: string;
  histogram: HistogramItem[];
  areaSeriesColor: string;
}

interface DurationDistributionChartProps {
  data: DurationDistributionChartData[];
  hasData: boolean;
  markerCurrentEvent?: number;
  markerValue: number;
  onChartSelection?: BrushEndListener;
  selection?: [number, number];
  status: FETCH_STATUS;
  eventType: ProcessorEvent.span | ProcessorEvent.transaction;
}

const getAnnotationsStyle = (color = 'gray'): LineAnnotationStyle => ({
  line: {
    strokeWidth: 1,
    stroke: color,
    opacity: 0.8,
  },
  details: {
    fontSize: 8,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    fill: color,
    padding: 0,
  },
});

// With a log based y axis in combination with the `CURVE_STEP_AFTER` style,
// the line of an area would not go down to 0 but end on the y axis at the last value >0.
// By replacing the 0s with a small value >0 the line will be drawn as intended.
// This is just to visually fix the line, for tooltips, that number will be again rounded down to 0.
// Note this workaround is only safe to use for this type of chart because it works with
// count based values and not a float based metric for example on the y axis.
const Y_AXIS_MIN_DOMAIN = 0.5;
const Y_AXIS_MIN_VALUE = 0.0001;

export const replaceHistogramZerosWithMinimumDomainValue = (
  histogramItems: HistogramItem[]
) =>
  histogramItems.reduce((histogramItem, _, i) => {
    if (histogramItem[i].doc_count === 0) {
      histogramItem[i].doc_count = Y_AXIS_MIN_VALUE;
    }
    return histogramItem;
  }, histogramItems);

// Create and call a duration formatter for every value since the durations for the
// x axis might have a wide range of values e.g. from low milliseconds to large seconds.
// This way we can get different suitable units across ticks.
const xAxisTickFormat: TickFormatter<number> = (d) =>
  getDurationFormatter(d, 0.9999)(d).formatted;

export function DurationDistributionChart({
  data,
  hasData,
  markerCurrentEvent,
  markerValue,
  onChartSelection,
  selection,
  status,
  eventType,
}: DurationDistributionChartProps) {
  const chartTheme = useChartTheme();
  const euiTheme = useTheme();
  const markerPercentile = DEFAULT_PERCENTILE_THRESHOLD;

  const annotationsDataValues: LineAnnotationDatum[] = [
    {
      dataValue: markerValue,
      details: i18n.translate(
        'xpack.apm.durationDistribution.chart.percentileMarkerLabel',
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
    Math.max(
      ...flatten(data.map((d) => d.histogram)).map((d) => d.doc_count)
    ) ?? 0;
  const yTicks = Math.max(1, Math.ceil(Math.log10(yMax)));
  const yAxisMaxDomain = Math.pow(10, yTicks);
  const yAxisDomain = {
    min: Y_AXIS_MIN_DOMAIN,
    max: yAxisMaxDomain,
  };

  const selectionAnnotation =
    selection !== undefined
      ? [
          {
            coordinates: {
              x0: selection[0],
              x1: selection[1],
              y0: 0,
              y1: yAxisMaxDomain,
            },
            details: 'selection',
          },
        ]
      : undefined;

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        histogram: replaceHistogramZerosWithMinimumDomainValue(d.histogram),
      })),
    [data]
  );

  return (
    <div
      data-test-subj="apmCorrelationsChart"
      style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      <ChartContainer height={250} hasData={hasData} status={status}>
        <Chart>
          <Settings
            rotation={0}
            theme={[
              {
                legend: {
                  spacingBuffer: 100,
                },
                areaSeriesStyle: {
                  line: {
                    visible: true,
                  },
                  point: {
                    visible: false,
                    radius: 0,
                  },
                },
                axes: {
                  tickLine: {
                    visible: true,
                    size: 5,
                    padding: 10,
                  },
                  tickLabel: {
                    fontSize: 10,
                    fill: euiTheme.eui.euiColorMediumShade,
                    padding: 0,
                  },
                },
              },
              ...chartTheme,
            ]}
            showLegend={true}
            legendPosition={Position.Bottom}
            onBrushEnd={onChartSelection}
          />
          {selectionAnnotation !== undefined && (
            <RectAnnotation
              dataValues={selectionAnnotation}
              id="rect_annotation_1"
              style={{
                strokeWidth: 1,
                stroke: euiTheme.eui.euiColorLightShade,
                fill: euiTheme.eui.euiColorLightShade,
                opacity: 0.9,
              }}
              hideTooltips={true}
            />
          )}
          {typeof markerCurrentEvent === 'number' && (
            <LineAnnotation
              id="annotation_current_event"
              domainType={AnnotationDomainType.XDomain}
              dataValues={[
                {
                  dataValue: markerCurrentEvent,
                  details: i18n.translate(
                    'xpack.apm.durationDistribution.chart.currentEventMarkerLabel',
                    {
                      defaultMessage: 'Current sample',
                    }
                  ),
                },
              ]}
              style={getAnnotationsStyle(euiPaletteColorBlind()[0])}
              marker={i18n.translate(
                'xpack.apm.durationDistribution.chart.currentEventMarkerLabel',
                {
                  defaultMessage: 'Current sample',
                }
              )}
              markerPosition={'bottom'}
            />
          )}
          <LineAnnotation
            id="apmCorrelationsChartPercentileAnnotation"
            domainType={AnnotationDomainType.XDomain}
            dataValues={annotationsDataValues}
            style={getAnnotationsStyle()}
            marker={`${markerPercentile}p`}
            markerPosition={'top'}
          />
          <Axis
            id="x-axis"
            title={i18n.translate(
              'xpack.apm.durationDistribution.chart.latencyLabel',
              { defaultMessage: 'Latency' }
            )}
            position={Position.Bottom}
            tickFormat={xAxisTickFormat}
            gridLine={{ visible: false }}
          />
          <Axis
            id="y-axis"
            domain={yAxisDomain}
            title={
              eventType === ProcessorEvent.transaction
                ? NUMBER_OF_TRANSACTIONS_LABEL
                : NUMBER_OF_SPANS_LABEL
            }
            position={Position.Left}
            ticks={yTicks}
            gridLine={{ visible: true }}
          />
          {chartData.map((d) => (
            <AreaSeries
              key={d.id}
              id={d.id}
              xScaleType={ScaleType.Log}
              yScaleType={ScaleType.Log}
              data={d.histogram}
              curve={CurveType.CURVE_STEP_AFTER}
              xAccessor="key"
              yAccessors={['doc_count']}
              color={d.areaSeriesColor}
              fit="linear"
              areaSeriesStyle={{
                fit: {
                  line: { visible: true },
                },
              }}
              // To make the area appear with a continuous line,
              // we changed the original data to replace values of 0 with Y_AXIS_MIN_DOMAIN.
              // To show the correct values again in tooltips, we use a custom tickFormat to round values.
              // We can safely do this because all duration values above 0 are without decimal points anyway.
              tickFormat={(p) => `${Math.floor(p)}`}
            />
          ))}
        </Chart>
      </ChartContainer>
    </div>
  );
}
