/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

import { useChartTheme } from '../../../../../../observability/public';

import { getDurationFormatter } from '../../../../../common/utils/formatters';
import type { HistogramItem } from '../../../../../common/search_strategies/types';

import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';

import { ChartContainer } from '../chart_container';

export interface TransactionDistributionChartData {
  id: string;
  histogram: HistogramItem[];
}

interface TransactionDistributionChartProps {
  data: TransactionDistributionChartData[];
  hasData: boolean;
  markerCurrentTransaction?: number;
  markerValue: number;
  markerPercentile: number;
  onChartSelection?: BrushEndListener;
  selection?: [number, number];
  status: FETCH_STATUS;
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

// TODO Revisit this approach since it actually manipulates the numbers
// showing in the chart and its tooltips.
const CHART_PLACEHOLDER_VALUE = 0.0001;

// Elastic charts will show any lone bin (i.e. a populated bin followed by empty bin)
// as a circular marker instead of a bar
// This provides a workaround by making the next bin not empty
export const replaceHistogramDotsWithBars = (histogramItems: HistogramItem[]) =>
  histogramItems.reduce((histogramItem, _, i) => {
    if (
      histogramItem[i - 1]?.doc_count > 0 &&
      histogramItem[i - 1]?.doc_count !== CHART_PLACEHOLDER_VALUE &&
      histogramItem[i].doc_count === 0
    ) {
      histogramItem[i].doc_count = CHART_PLACEHOLDER_VALUE;
    }
    return histogramItem;
  }, histogramItems);

// Create and call a duration formatter for every value since the durations for the
// x axis might have a wide range of values e.g. from low milliseconds to large seconds.
// This way we can get different suitable units across ticks.
const xAxisTickFormat: TickFormatter<number> = (d) =>
  getDurationFormatter(d, 0.9999)(d).formatted;

export function TransactionDistributionChart({
  data,
  hasData,
  markerCurrentTransaction,
  markerValue,
  markerPercentile,
  onChartSelection,
  selection,
  status,
}: TransactionDistributionChartProps) {
  const chartTheme = useChartTheme();
  const euiTheme = useTheme();

  const areaSeriesColors = [
    euiTheme.eui.euiColorVis1,
    euiTheme.eui.euiColorVis2,
    euiTheme.eui.euiColorVis5,
  ];

  const annotationsDataValues: LineAnnotationDatum[] = [
    {
      dataValue: markerValue,
      details: i18n.translate(
        'xpack.apm.transactionDistribution.chart.percentileMarkerLabel',
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
  const yTicks = Math.ceil(Math.log10(yMax));
  const yAxisDomain = {
    min: 0.9,
    max: Math.pow(10, yTicks),
  };

  const selectionAnnotation =
    selection !== undefined
      ? [
          {
            coordinates: {
              x0: selection[0],
              x1: selection[1],
              y0: 0,
              y1: 100000,
            },
            details: 'selection',
          },
        ]
      : undefined;

  return (
    <div
      data-test-subj="apmCorrelationsChart"
      style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      <ChartContainer height={250} hasData={hasData} status={status}>
        <Chart>
          <Settings
            rotation={0}
            theme={{
              ...chartTheme,
              legend: {
                spacingBuffer: 100,
              },
              areaSeriesStyle: {
                line: {
                  visible: false,
                },
              },
              axes: {
                ...chartTheme.axes,
                tickLine: {
                  size: 5,
                },
                tickLabel: {
                  fontSize: 10,
                  fill: euiTheme.eui.euiColorMediumShade,
                  padding: 0,
                },
              },
            }}
            showLegend
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
          {typeof markerCurrentTransaction === 'number' && (
            <LineAnnotation
              id="annotation_current_transaction"
              domainType={AnnotationDomainType.XDomain}
              dataValues={[
                {
                  dataValue: markerCurrentTransaction,
                  details: i18n.translate(
                    'xpack.apm.transactionDistribution.chart.currentTransactionMarkerLabel',
                    {
                      defaultMessage: 'Current sample',
                    }
                  ),
                },
              ]}
              style={getAnnotationsStyle(euiPaletteColorBlind()[0])}
              marker={i18n.translate(
                'xpack.apm.transactionDistribution.chart.currentTransactionMarkerLabel',
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
            title=""
            position={Position.Bottom}
            tickFormat={xAxisTickFormat}
            gridLine={{ visible: false }}
          />
          <Axis
            id="y-axis"
            domain={yAxisDomain}
            title={i18n.translate(
              'xpack.apm.transactionDistribution.chart.numberOfTransactionsLabel',
              { defaultMessage: '# transactions' }
            )}
            position={Position.Left}
            ticks={yTicks}
            gridLine={{ visible: true }}
          />
          {data.map((d, i) => (
            <AreaSeries
              key={d.id}
              id={d.id}
              xScaleType={ScaleType.Log}
              yScaleType={ScaleType.Log}
              data={replaceHistogramDotsWithBars(d.histogram)}
              curve={CurveType.CURVE_STEP_AFTER}
              xAccessor="key"
              yAccessors={['doc_count']}
              color={areaSeriesColors[i]}
              fit="lookahead"
            />
          ))}
        </Chart>
      </ChartContainer>
    </div>
  );
}
