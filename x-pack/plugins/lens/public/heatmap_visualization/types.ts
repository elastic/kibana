/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomPaletteState, PaletteOutput } from '../../../../../src/plugins/charts/common';
import type { LensBrushEvent, LensFilterEvent } from '../types';
import type { LensMultiTable, FormatFactory, CustomPaletteParams, LayerType } from '../../common';
import type { HeatmapGridConfigResult, HeatmapLegendConfigResult } from '../../common/expressions';
import { CHART_SHAPES, LENS_HEATMAP_RENDERER } from './constants';
import type { ChartsPluginSetup, PaletteRegistry } from '../../../../../src/plugins/charts/public';

export type ChartShapes = typeof CHART_SHAPES[keyof typeof CHART_SHAPES];

export interface SharedHeatmapLayerState {
  shape: ChartShapes;
  xAccessor?: string;
  yAccessor?: string;
  valueAccessor?: string;
  legend: HeatmapLegendConfigResult;
  gridConfig: HeatmapGridConfigResult;
}

export type HeatmapLayerState = SharedHeatmapLayerState & {
  layerId: string;
  layerType: LayerType;
};

export type HeatmapVisualizationState = HeatmapLayerState & {
  // need to store the current accessor to reset the color stops at accessor change
  palette?: PaletteOutput<CustomPaletteParams> & { accessor: string };
};

export type HeatmapExpressionArgs = SharedHeatmapLayerState & {
  title?: string;
  description?: string;
  palette: PaletteOutput<CustomPaletteState>;
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
  paletteService: PaletteRegistry;
};
