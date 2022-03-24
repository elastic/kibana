/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  Chart,
  HistogramBarSeries,
  Position,
  Settings,
  ChartSizeArray,
  ScaleType,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import React, { useMemo } from 'react';

import { useTheme, UpdateDateRange, ChartData } from '../../../../common/components/charts/common';
import { histogramDateTimeFormatter } from '../../../../common/components/utils';
import { hasValueToDisplay } from '../../../../common/utils/validators';
import { DraggableLegend } from '../../../../common/components/charts/draggable_legend';
import { LegendItem } from '../../../../common/components/charts/draggable_legend_item';
import { EMPTY_VALUE_LABEL } from '../../../../common/components/charts/translation';

import type { HistogramData } from './types';

const DEFAULT_CHART_HEIGHT = 174;

interface AlertsHistogramProps {
  chartHeight?: number;
  from: string;
  legendItems: LegendItem[];
  legendPosition?: Position;
  loading: boolean;
  showLegend?: boolean;
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
    legendPosition = Position.Right,
    loading,
    showLegend,
    to,
    updateDateRange,
  }) => {
    const theme = useTheme();

    const chartSize: ChartSizeArray = useMemo(() => ['100%', chartHeight], [chartHeight]);
    const xAxisId = 'alertsHistogramAxisX';
    const yAxisId = 'alertsHistogramAxisY';
    const id = 'alertsHistogram';
    const yAccessors = useMemo(() => ['y'], []);
    const splitSeriesAccessors = useMemo(
      () => [(datum: ChartData) => (hasValueToDisplay(datum.g) ? datum.g : EMPTY_VALUE_LABEL)],
      []
    );
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
                // showLegend controls the default legend coming from Elastic chart, we show them when our customised legend items doesn't exist (but we still want to show legend).
                showLegend={showLegend && legendItems.length === 0}
                showLegendExtra={showLegend}
                theme={theme}
              />

              <Axis id={xAxisId} position={Position.Bottom} tickFormat={tickFormat} />

              <Axis id={yAxisId} position={Position.Left} />

              <HistogramBarSeries
                id={id}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
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
