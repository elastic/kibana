/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@elastic/charts';
import { PaletteOutput } from '../../../../../src/plugins/charts/common';
import { FormatFactory, LensBrushEvent, LensFilterEvent, LensMultiTable } from '../types';
import {
  CHART_SHAPES,
  HEATMAP_GRID_FUNCTION,
  LEGEND_FUNCTION,
  LENS_HEATMAP_RENDERER,
} from './constants';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';

export type ChartShapes = typeof CHART_SHAPES[keyof typeof CHART_SHAPES];

export interface SharedHeatmapLayerState {
  shape: ChartShapes;
  xAccessor?: string;
  yAccessor?: string;
  valueAccessor?: string;
  legend: LegendConfigResult;
  gridConfig: HeatmapGridConfigResult;
}

export type HeatmapLayerState = SharedHeatmapLayerState & {
  layerId: string;
};

export type HeatmapVisualizationState = HeatmapLayerState & {
  palette?: PaletteOutput;
};

export type HeatmapExpressionArgs = SharedHeatmapLayerState & {
  title?: string;
  description?: string;
  palette: PaletteOutput;
};

export interface HeatmapRender {
  type: 'render';
  as: typeof LENS_HEATMAP_RENDERER;
  value: HeatmapExpressionProps;
}

export interface HeatmapExpressionProps {
  data: LensMultiTable;
  args: HeatmapExpressionArgs;
}

export type HeatmapRenderProps = HeatmapExpressionProps & {
  timeZone: string;
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  onClickValue: (data: LensFilterEvent['data']) => void;
  onSelectRange: (data: LensBrushEvent['data']) => void;
};

export interface HeatmapLegendConfig {
  /**
   * Flag whether the legend should be shown. If there is just a single series, it will be hidden
   */
  isVisible: boolean;
  /**
   * Position of the legend relative to the chart
   */
  position: Position;
}

export type LegendConfigResult = HeatmapLegendConfig & { type: typeof LEGEND_FUNCTION };

export interface HeatmapGridConfig {
  // grid
  strokeWidth?: number;
  strokeColor?: string;
  cellHeight?: number;
  cellWidth?: number;
  // cells
  isCellLabelVisible: boolean;
  // Y-axis
  isYAxisLabelVisible: boolean;
  yAxisLabelWidth?: number;
  yAxisLabelColor?: string;
  // X-axis
  isXAxisLabelVisible: boolean;
}

export type HeatmapGridConfigResult = HeatmapGridConfig & { type: typeof HEATMAP_GRID_FUNCTION };
