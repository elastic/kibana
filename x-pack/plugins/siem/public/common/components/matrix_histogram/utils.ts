/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScaleType, Position } from '@elastic/charts';
import { get, groupBy, map, toPairs } from 'lodash/fp';

import { UpdateDateRange, ChartSeriesData } from '../charts/common';
import { MatrixHistogramMappingTypes, BarchartConfigs } from './types';
import { MatrixOverTimeHistogramData } from '../../../graphql/types';
import { histogramDateTimeFormatter } from '../utils';

interface GetBarchartConfigsProps {
  chartHeight?: number;
  from: number;
  legendPosition?: Position;
  to: number;
  onBrushEnd: UpdateDateRange;
  yTickFormatter?: (value: number) => string;
  showLegend?: boolean;
}

export const DEFAULT_CHART_HEIGHT = 174;
export const DEFAULT_Y_TICK_FORMATTER = (value: string | number): string => value.toLocaleString();

export const getBarchartConfigs = ({
  chartHeight,
  from,
  legendPosition,
  to,
  onBrushEnd,
  yTickFormatter,
  showLegend,
}: GetBarchartConfigsProps): BarchartConfigs => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
  },
  axis: {
    xTickFormatter: histogramDateTimeFormatter([from, to]),
    yTickFormatter: yTickFormatter != null ? yTickFormatter : DEFAULT_Y_TICK_FORMATTER,
    tickSize: 8,
  },
  settings: {
    legendPosition: legendPosition ?? Position.Right,
    onBrushEnd,
    showLegend: showLegend ?? true,
    showLegendExtra: true,
    theme: {
      scales: {
        barsPadding: 0.08,
      },
      chartMargins: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      chartPaddings: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
  },
  customHeight: chartHeight ?? DEFAULT_CHART_HEIGHT,
});

export const defaultLegendColors = [
  '#1EA593',
  '#2B70F7',
  '#CE0060',
  '#38007E',
  '#FCA5D3',
  '#F37020',
  '#E49E29',
  '#B0916F',
  '#7B000B',
  '#34130C',
];

export const formatToChartDataItem = ([key, value]: [
  string,
  MatrixOverTimeHistogramData[]
]): ChartSeriesData => ({
  key,
  value,
});

export const getCustomChartData = (
  data: MatrixOverTimeHistogramData[] | null,
  mapping?: MatrixHistogramMappingTypes
): ChartSeriesData[] => {
  if (!data) return [];
  const dataGroupedByEvent = groupBy('g', data);
  const dataGroupedEntries = toPairs(dataGroupedByEvent);
  const formattedChartData = map(formatToChartDataItem, dataGroupedEntries);

  if (mapping)
    return map((item: ChartSeriesData) => {
      const mapItem = get(item.key, mapping);
      return { ...item, color: mapItem?.color };
    }, formattedChartData);
  else return formattedChartData;
};
