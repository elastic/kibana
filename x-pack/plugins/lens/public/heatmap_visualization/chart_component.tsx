/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  Chart,
  Heatmap,
  HeatmapBrushEvent,
  HeatmapSpec,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { VisualizationContainer } from '../visualization_container';
import { HeatmapRenderProps } from './types';
import './index.scss';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

export const HeatmapComponent: FC<HeatmapRenderProps> = ({
  data,
  args,
  timeZone,
  formatFactory,
}) => {
  const isDarkTheme = false;
  const onElementClick = () => {};

  const table = Object.values(data.tables)[0];

  const chartData = table.rows;

  const xAxis = table.columns.find((v) => v.id === args.xAccessor);

  if (!xAxis) {
    // Chart is not ready
    return null;
  }

  const xAxisMeta = xAxis.meta;
  const xScaleType = xAxisMeta.type === 'date' ? ScaleType.Time : ScaleType.Ordinal;

  const xValuesFormatter = formatFactory(xAxisMeta.params);

  const config: HeatmapSpec['config'] = {
    onBrushEnd: (e: HeatmapBrushEvent) => {},
    grid: {
      cellHeight: {
        min: 30,
        max: 30,
      },
      stroke: {
        width: 1,
        color: '#D3DAE6',
      },
    },
    cell: {
      maxWidth: 'fill',
      maxHeight: 'fill',
      label: {
        visible: false,
      },
      border: {
        stroke: '#D3DAE6',
        strokeWidth: 0,
      },
    },
    yAxisLabel: {
      visible: true,
      // eui color subdued
      fill: `#6a717d`,
      padding: 8,
    },
    xAxisLabel: {
      visible: true,
      // eui color subdued
      fill: `#98A2B3`,
      formatter: (v: number | string) => xValuesFormatter.convert(v),
    },
    brushMask: {
      fill: isDarkTheme ? 'rgb(30,31,35,80%)' : 'rgb(247,247,247,50%)',
    },
    brushArea: {
      stroke: isDarkTheme ? 'rgb(255, 255, 255)' : 'rgb(105, 112, 125)',
    },
    timeZone,
  };

  return (
    <Chart>
      <Settings
        onElementClick={onElementClick}
        showLegend
        legendPosition={Position.Top}
        xDomain={{
          min: data.dateRange?.fromDate.getTime(),
          max: data.dateRange?.toDate.getTime(),
          minInterval: 1800000,
        }}
        debugState={window._echDebugStateFlag ?? false}
      />
      <Heatmap
        id={'test'}
        colorScale={ScaleType.Linear}
        data={chartData}
        ranges={[0, 40, 90]}
        xAccessor={args.xAccessor}
        yAccessor={args.yAccessor}
        valueAccessor={args.valueAccessor}
        xScaleType={xScaleType}
        ySortPredicate="dataIndex"
        config={config}
      />
    </Chart>
  );
};

const MemoizedChart = React.memo(HeatmapComponent);

export function HeatmapChartReportable(props: HeatmapRenderProps) {
  const [state, setState] = useState({
    isReady: false,
  });

  // It takes a cycle for the XY chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setState({ isReady: true });
  }, [setState]);

  return (
    <VisualizationContainer
      className="lnsHeatmapExpression__container"
      isReady={state.isReady}
      reportTitle={props.args.title}
      reportDescription={props.args.description}
    >
      <MemoizedChart {...props} />
    </VisualizationContainer>
  );
}
