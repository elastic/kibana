/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
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
import type { CustomPaletteState } from 'src/plugins/charts/public';
import { VisualizationContainer } from '../visualization_container';
import type { HeatmapRenderProps } from './types';
import './index.scss';
import type { LensBrushEvent, LensFilterEvent } from '../types';
import {
  applyPaletteParams,
  defaultPaletteParams,
  EmptyPlaceholder,
  findMinMaxByColumnId,
} from '../shared_components';
import { LensIconChartHeatmap } from '../assets/chart_heatmap';
import { DEFAULT_PALETTE_NAME } from './constants';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

function getStops(
  { colors, stops, range }: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  if (stops.length) {
    return stops.slice(0, stops.length - 1);
  }
  // Do not use relative values here
  const maxValue = range === 'percent' ? 100 : max;
  const minValue = range === 'percent' ? 0 : min;
  const step = (maxValue - minValue) / colors.length;
  return colors.slice(0, colors.length - 1).map((_, i) => minValue + (i + 1) * step);
}

/**
 * Heatmaps use a different convention than palettes (same convention as EuiColorStops)
 * so stops need to be left shifted.
 * Values normalization provides a percent => absolute array of values
 */
function shiftAndNormalizeStops(
  params: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  // data min is the fallback in case of default options
  const absMin = params.range === 'percent' ? 0 : min;
  return [params.stops.length ? params.rangeMin : absMin, ...getStops(params, { min, max })].map(
    (value) => {
      let result = value;
      if (params.range === 'percent') {
        result = min + ((max - min) * value) / 100;
      }
      // for a range of 1 value the formulas above will divide by 0, so here's a safety guard
      if (Number.isNaN(result)) {
        return 1;
      }
      return Number(result.toFixed(2));
    }
  );
}

function computeColorRanges(
  paletteService: HeatmapRenderProps['paletteService'],
  paletteParams: CustomPaletteState | undefined,
  baseColor: string,
  minMax: { min: number; max: number }
) {
  const paletteColors =
    paletteParams?.colors ||
    applyPaletteParams(paletteService, { type: 'palette', name: DEFAULT_PALETTE_NAME }, minMax).map(
      ({ color }) => color
    );
  // Repeat the first color at the beginning to cover below and above the defined palette
  const colors = [paletteColors[0], ...paletteColors];

  const ranges = shiftAndNormalizeStops(
    {
      gradient: false,
      range: defaultPaletteParams.rangeType,
      rangeMin: defaultPaletteParams.rangeMin,
      rangeMax: defaultPaletteParams.rangeMax,
      stops: [],
      ...paletteParams,
      colors: colors.slice(1),
    },
    minMax
  );

  return { colors, ranges };
}

export const HeatmapComponent: FC<HeatmapRenderProps> = ({
  data,
  args,
  timeZone,
  formatFactory,
  chartsThemeService,
  onClickValue,
  onSelectRange,
  paletteService,
}) => {
  const chartTheme = chartsThemeService.useChartsTheme();
  const isDarkTheme = chartsThemeService.useDarkMode();

  const tableId = Object.keys(data.tables)[0];
  const table = data.tables[tableId];

  const paletteParams = args.palette?.params;

  const xAxisColumnIndex = table.columns.findIndex((v) => v.id === args.xAccessor);
  const yAxisColumnIndex = table.columns.findIndex((v) => v.id === args.yAccessor);

  const xAxisColumn = table.columns[xAxisColumnIndex];
  const yAxisColumn = table.columns[yAxisColumnIndex];
  const valueColumn = table.columns.find((v) => v.id === args.valueAccessor);

  const minMaxByColumnId = useMemo(
    () => findMinMaxByColumnId([args.valueAccessor!], table),
    [args.valueAccessor, table]
  );

  if (!xAxisColumn || !valueColumn) {
    // Chart is not ready
    return null;
  }

  let chartData = table.rows.filter((v) => typeof v[args.valueAccessor!] === 'number');

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

  // Fallback to the ordinal scale type when a single row of data is provided.
  // Related issue https://github.com/elastic/elastic-charts/issues/1184
  const xScaleType =
    isTimeBasedSwimLane && chartData.length > 1 ? ScaleType.Time : ScaleType.Ordinal;

  const xValuesFormatter = formatFactory(xAxisMeta.params);
  const valueFormatter = formatFactory(valueColumn.meta.params);

  const { colors, ranges } = computeColorRanges(
    paletteService,
    paletteParams,
    isDarkTheme ? '#000' : '#fff',
    minMaxByColumnId[args.valueAccessor!]
  );

  const bands = ranges.map((start, index, array) => {
    return {
      // with the default continuity:above the every range is left-closed
      start,
      // with the default continuity:above the last range is right-open
      end: index === array.length - 1 ? Infinity : array[index + 1],
      // the current colors array contains a duplicated color at the beginning that we need to skip
      color: colors[index + 1],
    };
  });

  const onElementClick = ((e: HeatmapElementEvent[]) => {
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
    onClickValue(context);
  }) as ElementClickListener;

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
      onClickValue(context);
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
      textColor: chartTheme.axes?.tickLabel?.fill ?? '#6a717d',
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
      textColor: chartTheme.axes?.tickLabel?.fill ?? `#6a717d`,
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

  return (
    <Chart>
      <Settings
        onElementClick={onElementClick}
        showLegend={args.legend.isVisible}
        legendPosition={args.legend.position}
        debugState={window._echDebugStateFlag ?? false}
        theme={{
          ...chartTheme,
          legend: {
            labelOptions: { maxLines: args.legend.shouldTruncate ? args.legend?.maxLines ?? 1 : 0 },
          },
        }}
      />
      <Heatmap
        id={tableId}
        name={valueColumn.name}
        colorScale={{
          type: 'bands',
          bands,
        }}
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

  // It takes a cycle for the chart to render. This prevents
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
