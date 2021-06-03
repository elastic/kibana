/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
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
import { euiPaletteForTemperature } from '@elastic/eui';
import { VisualizationContainer } from '../visualization_container';
import { HeatmapRenderProps } from './types';
import './index.scss';
import { LensBrushEvent, LensFilterEvent } from '../types';
import { desanitizeFilterContext } from '../utils';
import { search } from '../../../../../src/plugins/data/public';
import { EmptyPlaceholder } from '../shared_components';
import { LensIconChartHeatmap } from '../assets/chart_heatmap';

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
  chartsThemeService,
  onClickValue,
  onSelectRange,
}) => {
  const chartTheme = chartsThemeService.useChartsTheme();
  const isDarkTheme = chartsThemeService.useDarkMode();

  const tableId = Object.keys(data.tables)[0];
  const table = data.tables[tableId];

  let chartData = table.rows;

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
    // required for tooltip
    chartData = chartData.map((row) => {
      return {
        ...row,
        unifiedY: '',
      };
    });
  }

  const xAxisMeta = xAxisColumn.meta;
  const isTimeBasedSwimLane = xAxisMeta.type === 'date';
  const xScaleType = isTimeBasedSwimLane ? ScaleType.Time : ScaleType.Ordinal;

  const xValuesFormatter = formatFactory(xAxisMeta.params);
  const valueFormatter = formatFactory(valueColumn.meta.params);

  // Enable xDomain when https://github.com/elastic/elastic-charts/issues/1165 is resolved.
  // @ts-ignore
  const xDomain = (() => {
    if (!isTimeBasedSwimLane) return null;
    const dateInterval = search.aggs.getDateHistogramMetaDataByDatatableColumn(xAxisColumn)
      ?.interval;
    if (!dateInterval) return null;
    const intervalDuration = search.aggs.parseInterval(dateInterval);
    if (!intervalDuration) return null;
    const minInterval = intervalDuration.as('milliseconds');
    const dateRangeMin = data.dateRange?.fromDate.getTime();

    if (!dateRangeMin) {
      return;
    }

    const actualMin = dateRangeMin - (dateRangeMin % minInterval);

    return {
      min: actualMin,
      max: data.dateRange?.toDate.getTime(),
      minInterval,
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
      ...(yAxisColumn
        ? [
            {
              row: table.rows.findIndex((r) => r[yAxisColumn.id] === y),
              column: yAxisColumnIndex,
              value: y,
            },
          ]
        : []),
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

  const onBrushEnd = (e: HeatmapBrushEvent) => {
    const { x, y } = e;

    const xAxisFieldName = xAxisColumn.meta.field;
    const timeFieldName = isTimeBasedSwimLane ? xAxisFieldName : '';

    if (isTimeBasedSwimLane) {
      const context: LensBrushEvent['data'] = {
        range: x as number[],
        table,
        column: xAxisColumnIndex,
        timeFieldName,
      };
      onSelectRange(context);
    } else {
      const points: Array<{ row: number; column: number; value: string | number }> = [];

      if (yAxisColumn) {
        (y as string[]).forEach((v) => {
          points.push({
            row: table.rows.findIndex((r) => r[yAxisColumn.id] === v),
            column: yAxisColumnIndex,
            value: v,
          });
        });
      }

      (x as string[]).forEach((v) => {
        points.push({
          row: table.rows.findIndex((r) => r[xAxisColumn.id] === v),
          column: xAxisColumnIndex,
          value: v,
        });
      });

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
    }
  };

  const config: HeatmapSpec['config'] = {
    onBrushEnd,
    grid: {
      stroke: {
        width:
          args.gridConfig.strokeWidth ?? chartTheme.axes?.gridLine?.horizontal?.strokeWidth ?? 1,
        color:
          args.gridConfig.strokeColor ?? chartTheme.axes?.gridLine?.horizontal?.stroke ?? '#D3DAE6',
      },
      cellHeight: {
        max: 'fill',
        min: 1,
      },
    },
    cell: {
      maxWidth: 'fill',
      maxHeight: 'fill',
      label: {
        visible: args.gridConfig.isCellLabelVisible ?? false,
      },
      border: {
        strokeWidth: 0,
      },
    },
    yAxisLabel: {
      visible: !!yAxisColumn && args.gridConfig.isYAxisLabelVisible,
      // eui color subdued
      fill: chartTheme.axes?.tickLabel?.fill ?? '#6a717d',
      padding: yAxisColumn?.name ? 8 : 0,
      name: yAxisColumn?.name ?? '',
      ...(yAxisColumn
        ? {
            formatter: (v: number | string) => formatFactory(yAxisColumn.meta.params).convert(v),
          }
        : {}),
    },
    xAxisLabel: {
      visible: args.gridConfig.isXAxisLabelVisible,
      // eui color subdued
      fill: chartTheme.axes?.tickLabel?.fill ?? `#6a717d`,
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

  if (!chartData || !chartData.length) {
    return <EmptyPlaceholder icon={LensIconChartHeatmap} />;
  }

  const colorPalette = euiPaletteForTemperature(5);

  return (
    <Chart>
      <Settings
        onElementClick={onElementClick}
        showLegend={args.legend.isVisible}
        legendPosition={args.legend.position}
        debugState={window._echDebugStateFlag ?? false}
      />
      <Heatmap
        id={tableId}
        name={valueColumn.name}
        colorScale={ScaleType.Quantize}
        colors={colorPalette}
        data={chartData}
        xAccessor={args.xAccessor}
        yAccessor={args.yAccessor || 'unifiedY'}
        valueAccessor={args.valueAccessor}
        valueFormatter={(v: number) => valueFormatter.convert(v)}
        xScaleType={xScaleType}
        ySortPredicate="dataIndex"
        config={config}
        xSortPredicate="dataIndex"
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
