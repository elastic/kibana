/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  Chart,
  ElementClickListener,
  Heatmap,
  HeatmapBrushEvent,
  HeatmapElementEvent,
  HeatmapSpec,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { VisualizationContainer } from '../visualization_container';
import { HeatmapRenderProps } from './types';
import './index.scss';
import { LensFilterEvent } from '../types';
import { desanitizeFilterContext } from '../utils';
import { search } from '../../../../../src/plugins/data/public';

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
  onClickValue,
  onSelectRange,
}) => {
  const isDarkTheme = false;

  const table = Object.values(data.tables)[0];

  const chartData = table.rows;

  const xAxisColumnIndex = table.columns.findIndex((v) => v.id === args.xAccessor);
  const yAxisColumnIndex = table.columns.findIndex((v) => v.id === args.yAccessor);

  const xAxisColumn = table.columns[xAxisColumnIndex];
  const yAxisColumn = table.columns[yAxisColumnIndex];
  const valueColumn = table.columns.find((v) => v.id === args.valueAccessor);

  if (!xAxisColumn || !valueColumn) {
    // Chart is not ready
    return null;
  }

  if (!yAxisColumn) {
    chartData.forEach((row) => {
      row.unifiedY = i18n.translate('xpack.lens.heatmap.emptyYLabel', {
        defaultMessage: '(empty)',
      });
    });
  }

  const xAxisMeta = xAxisColumn.meta;
  const isTimeBasedSwimLane = xAxisMeta.type === 'date';
  const xScaleType = isTimeBasedSwimLane ? ScaleType.Time : ScaleType.Ordinal;

  const xValuesFormatter = formatFactory(xAxisMeta.params);
  const valueFormatter = formatFactory(valueColumn.meta.params);

  const xDomain = (() => {
    if (!isTimeBasedSwimLane) return null;
    const dateInterval = search.aggs.getDateHistogramMetaDataByDatatableColumn(xAxisColumn)
      ?.interval;
    if (!dateInterval) return null;
    const intervalDuration = search.aggs.parseInterval(dateInterval);
    if (!intervalDuration) return null;

    return {
      min: data.dateRange?.fromDate.getTime(),
      max: data.dateRange?.toDate.getTime(),
      minInterval: intervalDuration.as('milliseconds'),
    };
  })();

  // @ts-ignore
  const onElementClick: ElementClickListener = (e: HeatmapElementEvent[]) => {
    const cell = e[0][0];
    const { x, y } = cell.datum;

    const xAxisFieldName = xAxisColumn.meta.field;
    const timeFieldName = isTimeBasedSwimLane ? xAxisFieldName : '';

    const points = [
      {
        row: table.rows.findIndex((r) => r[xAxisColumn.id] === x),
        column: xAxisColumnIndex,
        value: x,
      },
      {
        row: table.rows.findIndex((r) => r[yAxisColumn.id] === y),
        column: yAxisColumnIndex,
        value: y,
      },
    ];

    const context: LensFilterEvent['data'] = {
      data: points.map((point) => ({
        row: point.row,
        column: point.column,
        value: point.value,
        table,
      })),
      timeFieldName,
    };
    onClickValue(desanitizeFilterContext(context));
  };

  const config: HeatmapSpec['config'] = {
    onBrushEnd: (e: HeatmapBrushEvent) => {},
    grid: {
      stroke: {
        width: args.gridConfig.strokeWidth ?? 1,
        color: args.gridConfig.strokeColor ?? '#D3DAE6',
      },
      cellHeight: {
        max: 'fill',
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
      name: yAxisColumn?.name,
      ...(yAxisColumn
        ? {
            formatter: (v: number | string) => formatFactory(yAxisColumn.meta.params).convert(v),
          }
        : {}),
    },
    xAxisLabel: {
      visible: args.gridConfig.isXAxisLabelVisible,
      // eui color subdued
      fill: `#98A2B3`,
      formatter: (v: number | string) => xValuesFormatter.convert(v),
      name: xAxisColumn.name,
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
        {...(xDomain ? { xDomain } : {})}
      />
      <Heatmap
        id={'heatmap'}
        name={valueColumn.name}
        colorScale={ScaleType.Linear}
        data={chartData}
        xAccessor={args.xAccessor}
        yAccessor={args.yAccessor || 'unifiedY'}
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
