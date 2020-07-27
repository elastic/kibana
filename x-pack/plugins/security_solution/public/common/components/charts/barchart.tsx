/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { Chart, BarSeries, Axis, Position, ScaleType, Settings } from '@elastic/charts';
import { getOr, get, isNumber } from 'lodash/fp';
import deepmerge from 'deepmerge';
import uuid from 'uuid';
import styled from 'styled-components';

import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { useTimeZone } from '../../lib/kibana';
import { defaultLegendColors } from '../matrix_histogram/utils';
import { useThrottledResizeObserver } from '../utils';

import { ChartPlaceHolder } from './chart_place_holder';
import {
  chartDefaultSettings,
  ChartSeriesConfigs,
  ChartSeriesData,
  checkIfAllValuesAreZero,
  getChartHeight,
  getChartWidth,
  WrappedByAutoSizer,
  useTheme,
} from './common';
import { DraggableLegend } from './draggable_legend';
import { LegendItem } from './draggable_legend_item';

const LegendFlexItem = styled(EuiFlexItem)`
  overview: hidden;
`;

const checkIfAllTheDataInTheSeriesAreValid = (series: ChartSeriesData): series is ChartSeriesData =>
  series != null &&
  !!get('value.length', series) &&
  (series.value || []).every(({ x, y }) => isNumber(y) && y >= 0);

const checkIfAnyValidSeriesExist = (
  data: ChartSeriesData[] | null | undefined
): data is ChartSeriesData[] =>
  Array.isArray(data) &&
  !checkIfAllValuesAreZero(data) &&
  data.some(checkIfAllTheDataInTheSeriesAreValid);

// Bar chart rotation: https://ela.st/chart-rotations
export const BarChartBaseComponent = ({
  data,
  forceHiddenLegend = false,
  ...chartConfigs
}: {
  data: ChartSeriesData[];
  width: string | null | undefined;
  height: string | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
  forceHiddenLegend?: boolean;
}) => {
  const theme = useTheme();
  const timeZone = useTimeZone();
  const xTickFormatter = get('configs.axis.xTickFormatter', chartConfigs);
  const yTickFormatter = get('configs.axis.yTickFormatter', chartConfigs);
  const tickSize = getOr(0, 'configs.axis.tickSize', chartConfigs);
  const xAxisId = `stat-items-barchart-${data[0].key}-x`;
  const yAxisId = `stat-items-barchart-${data[0].key}-y`;
  const settings = {
    ...chartDefaultSettings,
    ...deepmerge(get('configs.settings', chartConfigs), { theme }),
  };

  return chartConfigs.width && chartConfigs.height ? (
    <Chart>
      <Settings {...settings} showLegend={settings.showLegend && !forceHiddenLegend} />
      {data.map((series) => {
        const barSeriesKey = series.key;
        return checkIfAllTheDataInTheSeriesAreValid(series) ? (
          <BarSeries
            id={barSeriesKey}
            key={barSeriesKey}
            name={series.key}
            xScaleType={getOr(ScaleType.Linear, 'configs.series.xScaleType', chartConfigs)}
            yScaleType={getOr(ScaleType.Linear, 'configs.series.yScaleType', chartConfigs)}
            xAccessor="x"
            yAccessors={['y']}
            timeZone={timeZone}
            splitSeriesAccessors={['g']}
            data={series.value!}
            stackAccessors={get('configs.series.stackAccessors', chartConfigs)}
            color={series.color ? series.color : undefined}
          />
        ) : null;
      })}

      <Axis
        id={xAxisId}
        position={Position.Bottom}
        showOverlappingTicks={false}
        tickSize={tickSize}
        tickFormat={xTickFormatter}
      />

      <Axis id={yAxisId} position={Position.Left} tickSize={tickSize} tickFormat={yTickFormatter} />
    </Chart>
  ) : null;
};

BarChartBaseComponent.displayName = 'BarChartBaseComponent';

export const BarChartBase = React.memo(BarChartBaseComponent);

BarChartBase.displayName = 'BarChartBase';

interface BarChartComponentProps {
  barChart: ChartSeriesData[] | null | undefined;
  configs?: ChartSeriesConfigs | undefined;
  stackByField?: string;
  timelineId?: string;
}

const NO_LEGEND_DATA: LegendItem[] = [];

export const BarChartComponent: React.FC<BarChartComponentProps> = ({
  barChart,
  configs,
  stackByField,
  timelineId,
}) => {
  const { ref: measureRef, width, height } = useThrottledResizeObserver();
  const legendItems: LegendItem[] = useMemo(
    () =>
      barChart != null && stackByField != null
        ? barChart.map((d, i) => ({
            color: d.color ?? i < defaultLegendColors.length ? defaultLegendColors[i] : undefined,
            dataProviderId: escapeDataProviderId(
              `draggable-legend-item-${uuid.v4()}-${stackByField}-${d.key}`
            ),
            timelineId,
            field: stackByField,
            value: d.key,
          }))
        : NO_LEGEND_DATA,
    [barChart, stackByField, timelineId]
  );

  const customHeight = get('customHeight', configs);
  const customWidth = get('customWidth', configs);
  const chartHeight = getChartHeight(customHeight, height);
  const chartWidth = getChartWidth(customWidth, width);

  return checkIfAnyValidSeriesExist(barChart) ? (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={true}>
        <WrappedByAutoSizer ref={measureRef} height={chartHeight}>
          <BarChartBase
            configs={configs}
            data={barChart}
            forceHiddenLegend={stackByField != null}
            height={chartHeight}
            width={chartHeight}
          />
        </WrappedByAutoSizer>
      </EuiFlexItem>
      <LegendFlexItem grow={false}>
        <DraggableLegend legendItems={legendItems} height={height} />
      </LegendFlexItem>
    </EuiFlexGroup>
  ) : (
    <ChartPlaceHolder height={chartHeight} width={chartWidth} data={barChart} />
  );
};

export const BarChart = React.memo(BarChartComponent);
