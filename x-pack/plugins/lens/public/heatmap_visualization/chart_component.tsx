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

  const xAxisDef = table.columns.find((v) => v.id === args.xAccessor);
  const yAxisDef = table.columns.find((v) => v.id === args.yAccessor);
  const valueDef = table.columns.find((v) => v.id === args.valueAccessor);

  if (!xAxisDef || !valueDef || !yAxisDef) {
    // Chart is not ready
    return null;
  }

  const xAxisMeta = xAxisDef.meta;
  const xScaleType = xAxisMeta.type === 'date' ? ScaleType.Time : ScaleType.Ordinal;

  const xValuesFormatter = formatFactory(xAxisMeta.params);
  const yValuesFormatter = formatFactory(yAxisDef.meta.params);
  const valueFormatter = formatFactory(valueDef.meta.params);

  const config: HeatmapSpec['config'] = {
    onBrushEnd: (e: HeatmapBrushEvent) => {},
    grid: {
      stroke: {
        width: args.gridConfig.strokeWidth ?? 1,
        color: args.gridConfig.strokeColor ?? '#D3DAE6',
      },
    },
    cell: {
      maxWidth: 'fill',
      maxHeight: 'fill',
      label: {
        visible: args.gridConfig.isCellLabelVisible ?? false,
      },
      border: {
        stroke: '#D3DAE6',
        strokeWidth: 0,
      },
    },
    yAxisLabel: {
      visible: args.gridConfig.isYAxisLabelVisible,
      // eui color subdued
      fill: `#6a717d`,
      padding: 8,
      name: yAxisDef.name,
      formatter: (v: number | string) => yValuesFormatter.convert(v),
    },
    xAxisLabel: {
      visible: args.gridConfig.isXAxisLabelVisible,
      // eui color subdued
      fill: `#98A2B3`,
      formatter: (v: number | string) => xValuesFormatter.convert(v),
      name: xAxisDef.name,
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
        showLegend={args.legend.isVisible}
        legendPosition={args.legend.position}
        debugState={window._echDebugStateFlag ?? false}
      />
      <Heatmap
        id={'heatmap'}
        name={valueDef.name}
        colorScale={ScaleType.Linear}
        data={chartData}
        xAccessor={args.xAccessor}
        yAccessor={args.yAccessor}
        valueAccessor={args.valueAccessor}
        valueFormatter={(v: number) => valueFormatter.convert(v)}
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
