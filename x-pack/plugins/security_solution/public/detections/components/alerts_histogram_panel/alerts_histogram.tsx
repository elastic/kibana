/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  HistogramBarSeries,
  Position,
  Settings,
  ChartSizeArray,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import React, { useMemo } from 'react';

import { useTheme, UpdateDateRange } from '../../../common/components/charts/common';
import { histogramDateTimeFormatter } from '../../../common/components/utils';
import { DraggableLegend } from '../../../common/components/charts/draggable_legend';
import { LegendItem } from '../../../common/components/charts/draggable_legend_item';

import { HistogramData } from './types';

const DEFAULT_CHART_HEIGHT = 174;

interface AlertsHistogramProps {
  chartHeight?: number;
  from: string;
  legendItems: LegendItem[];
  legendPosition?: Position;
  loading: boolean;
  to: string;
  data: HistogramData[];
  updateDateRange: UpdateDateRange;
}
export const AlertsHistogram = React.memo<AlertsHistogramProps>(
  ({
    chartHeight = DEFAULT_CHART_HEIGHT,
    data,
    from,
    legendItems,
    legendPosition = 'right',
    loading,
    to,
    updateDateRange,
  }) => {
    const theme = useTheme();

    const chartSize: ChartSizeArray = useMemo(() => ['100%', chartHeight], [chartHeight]);
    const xAxisId = 'alertsHistogramAxisX';
    const yAxisId = 'alertsHistogramAxisY';
    const id = 'alertsHistogram';
    const yAccessors = useMemo(() => ['y'], []);
    const splitSeriesAccessors = useMemo(() => ['g'], []);
    const tickFormat = useMemo(() => histogramDateTimeFormatter([from, to]), [from, to]);

    return (
      <>
        {loading && (
          <EuiProgress
            data-test-subj="loadingPanelAlertsHistogram"
            size="xs"
            position="absolute"
            color="accent"
          />
        )}

        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={true}>
            <Chart size={chartSize}>
              <Settings
                legendPosition={legendPosition}
                onBrushEnd={updateDateRange}
                showLegend={legendItems.length === 0}
                showLegendExtra
                theme={theme}
              />

              <Axis id={xAxisId} position="bottom" tickFormat={tickFormat} />

              <Axis id={yAxisId} position="left" />

              <HistogramBarSeries
                id={id}
                xScaleType="time"
                yScaleType="linear"
                xAccessor="x"
                yAccessors={yAccessors}
                splitSeriesAccessors={splitSeriesAccessors}
                data={data}
              />
            </Chart>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {legendItems.length > 0 && (
              <DraggableLegend legendItems={legendItems} height={chartHeight} />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

AlertsHistogram.displayName = 'AlertsHistogram';
