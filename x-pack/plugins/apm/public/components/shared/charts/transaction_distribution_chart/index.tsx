/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import { HistogramItem } from '../../../../../common/search_strategies/correlations/types';

import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';

import { ChartContainer } from '../chart_container';

interface TransactionDistributionChartProps {
  field?: string;
  value?: string;
  histogram?: HistogramItem[];
  markerCurrentTransaction?: number;
  markerValue: number;
  markerPercentile: number;
  overallHistogram?: HistogramItem[];
  onChartSelection?: BrushEndListener;
  selection?: [number, number];
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

// Create and call a duration formatter for every value since the durations for the
// x axis might have a wide range of values e.g. from low milliseconds to large seconds.
// This way we can get different suitable units across ticks.
const xAxisTickFormat: TickFormatter<number> = (d) =>
  getDurationFormatter(d, 0.9999)(d).formatted;

export function TransactionDistributionChart({
  field: fieldName,
  value: fieldValue,
  histogram: originalHistogram,
  markerCurrentTransaction,
  markerValue,
  markerPercentile,
  overallHistogram,
  onChartSelection,
  selection,
}: TransactionDistributionChartProps) {
  const chartTheme = useChartTheme();
  const euiTheme = useTheme();

  const patchedOverallHistogram = useMemo(
    () => replaceHistogramDotsWithBars(overallHistogram),
    [overallHistogram]
  );

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
    Math.max(...(overallHistogram ?? []).map((d) => d.doc_count)) ?? 0;
  const yTicks = Math.ceil(Math.log10(yMax));
  const yAxisDomain = {
    min: 0.9,
    max: Math.pow(10, yTicks),
  };

  const histogram = replaceHistogramDotsWithBars(originalHistogram);

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
      <ChartContainer
        height={250}
        hasData={
          Array.isArray(patchedOverallHistogram) &&
          patchedOverallHistogram.length > 0
        }
        status={
          Array.isArray(patchedOverallHistogram)
            ? FETCH_STATUS.SUCCESS
            : FETCH_STATUS.LOADING
        }
      >
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
          <AreaSeries
            id={i18n.translate(
              'xpack.apm.transactionDistribution.chart.allTransactionsLabel',
              { defaultMessage: 'All transactions' }
            )}
            xScaleType={ScaleType.Log}
            yScaleType={ScaleType.Log}
            data={patchedOverallHistogram ?? []}
            curve={CurveType.CURVE_STEP_AFTER}
            xAccessor="key"
            yAccessors={['doc_count']}
            color={euiTheme.eui.euiColorVis1}
            fit="lookahead"
          />
          {Array.isArray(histogram) &&
            fieldName !== undefined &&
            fieldValue !== undefined && (
              <AreaSeries
                id={`apmTransactionDistributionChartAreaSeries${fieldName}${fieldValue}`}
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
