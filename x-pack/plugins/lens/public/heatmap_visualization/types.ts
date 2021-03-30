/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Position } from '@elastic/charts';
import { PaletteOutput } from '../../../../../src/plugins/charts/common';
import { FormatFactory, LensMultiTable } from '../types';
import { CHART_SHAPES, LENS_HEATMAP_RENDERER } from './constants';

export type ChartShapes = typeof CHART_SHAPES[keyof typeof CHART_SHAPES];

export interface SharedHeatmapLayerState {
  shape: ChartShapes;
  xAccessor?: string;
  yAccessor?: string;
  valueAccessor?: string;
  legend?: { isVisible: true; position: Position };
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
};
